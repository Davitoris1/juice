import React, { useState, useEffect, useRef } from 'react';

export default function GameGuildsWindow({ position, isDragging, isActive, handleMouseDown, handleDismiss, handleWindowClick, BASE_Z_INDEX, ACTIVE_Z_INDEX, userData, setUserData, startJuicing, playCollectSound, isJuicing }) {
    const [isJuicingLocal, setIsJuicingLocal] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [currentStretchId, setCurrentStretchId] = useState(null);
    const [timeJungled, setTimeJungled] = useState('0:00');
    const [startTime, setStartTime] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stopTime, setStopTime] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [totalPauseTimeSeconds, setTotalPauseTimeSeconds] = useState(0)
    const fileInputRef = useRef(null);
    const clickSoundRef = useRef(null);
    const expSoundRef = useRef(null);
    const congratsSoundRef = useRef(null);

    // Add play click function
    const playClick = () => {
        if (clickSoundRef.current) {
            clickSoundRef.current.currentTime = 0;
            clickSoundRef.current.play().catch(e => console.error('Error playing click:', e));
        }
    };

    const playExp = () => {
        if (expSoundRef.current) {
            expSoundRef.current.volume = 0.5;
            expSoundRef.current.currentTime = 0;
            expSoundRef.current.play().catch(e => console.error('Error playing exp:', e));
        }
    };

    const playCongratsSound = () => {
        if (congratsSoundRef.current) {
            congratsSoundRef.current.currentTime = 0;
            congratsSoundRef.current.play().catch(e => console.error('Error playing congrats sound:', e));
        }
    };

    useEffect(() => {
        let interval;
        let saveInterval;
        if (isJuicingLocal && startTime && !stopTime && !isPaused) {
            interval = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((now - startTime) / 1000 - totalPauseTimeSeconds);
                const minutes = Math.floor(diff / 60);
                const seconds = diff % 60;
                setTimeJungled(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }, 1000);
            // Update pausedTimeStart without actually pausing so if the broswer closes unexpectedly you can resume your progress
        if (isJuicingLocal && startTime && !stopTime && !isPaused){
            saveInterval = setInterval(async () => {
                try {
                    const response = await fetch('/api/pause-jungle-stretch', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            token: userData.token,
                            stretchId: currentStretchId
                        }),
                    });
        
                    if (!response.ok) {
                        throw new Error('Failed to pause jungle stretch');
                    }
                } catch (error) {
                    console.error('Error pausing jungle stretch:', error);
                }
            }, 10000)
        }
        }
        return () => {
            clearInterval(interval)
            clearInterval(saveInterval)
        };
    }, [isJuicingLocal, startTime, stopTime, isPaused]);

    // Load data
    useEffect(() => {
        async function loadData() {
            try {
                const response = await fetch('/api/load-jungle-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: userData.token
                    }),
                })
                if (!response.ok) {
                    throw new Error('Failed to pause jungle stretch');
                }

                const data = await response.json()
                if(data.id == undefined) return;
                setIsJuicingLocal(true);
                setCurrentStretchId(data.id);
                const startTimeDate = new Date(data.startTime)
                setStartTime(startTimeDate);
                setIsPaused(true);
                setTotalPauseTimeSeconds(data.totalPauseTimeSeconds);
                const now = new Date();
                const diff = Math.floor((now - startTimeDate) / 1000 - data.totalPauseTimeSeconds);
                const minutes = Math.floor(diff / 60);
                const seconds = diff % 60;
                setTimeJungled(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                
            } catch (error) {
                console.error('Error pausing jungle stretch:', error);
            }
        }
        loadData()
    }, [])

    const handleStartJuicing = async () => {
        if (!confirm("Just to confirm, you have your game editor ready and you're ready to start working on your game? also sorry but pls keep demo clip at 4mb or less, will fix this soon ~Thomas")) {
            return;
        }

        try {
            const response = await fetch('/api/start-jungle-stretch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: userData.token
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to start jungle stretch');
            }

            const data = await response.json();
            setCurrentStretchId(data.stretchId);
            setIsJuicingLocal(true);
            setStartTime(new Date());
            setStopTime(null);
            setSelectedVideo(null);
            setDescription('');
            playCongratsSound();
            setIsPaused(false);
            setTotalPauseTimeSeconds(0);

        } catch (error) {
            console.error('Error starting jungle stretch:', error);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                alert('Please select a video file');
                return;
            }
            
            // // Check file size (4MB = 4 * 1024 * 1024 bytes)
            // if (file.size > 4 * 1024 * 1024) {
            //     alert("I'm sorry, we have a 4mb limit on file uploads rn. I am fixing this! ~Thomas");
            //     return;
            // }
            
            setSelectedVideo(file);
            setStopTime(new Date());
        }
    };

    const handleEndStretch = async () => {
        if (!selectedVideo || !description.trim()) {
            alert('Please upload a video and add a description');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('video', selectedVideo);
            formData.append('description', description);
            formData.append('token', userData.token);
            formData.append('stretchId', currentStretchId);
            formData.append('stopTime', stopTime.toISOString());
            formData.append("isJuice", false)

            const uploadResponse = await fetch('https://sww48o88cs88sg8k84g4s4kg.a.selfhosted.hackclub.com/api/video/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload video');
            }

            try {
                const response = await fetch('/api/resume-jungle-stretch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: userData.token,
                        stretchId: currentStretchId
                    }),
                });
    
                if (!response.ok) {
                    throw new Error('Failed to resume jungle stretch');
                }
                const data = await response.json();
                console.log(data.newPauseTime)
                setTotalPauseTimeSeconds(data.newPauseTime)
                setIsPaused(false);
            } catch (error) {
                console.error('Error resuming jungle stretch:', error);
            }

            if (!response.ok) {
                throw new Error('Failed to create OMG moment');
            }

            // Fetch updated user data to get new total time
            const userResponse = await fetch('/api/user', {
                headers: {
                    'Authorization': `Bearer ${userData.token}`
                }
            });
            
            if (userResponse.ok) {
                const { userData: updatedUserData } = await userResponse.json();
                setUserData(updatedUserData);
            }

            // Play collect sound when successful
            playCollectSound();

            setIsJuicingLocal(false);
            setCurrentStretchId(null);
            setStartTime(null);
            setStopTime(null);
            setSelectedVideo(null);
            setDescription('');
            setTimeJungled('0:00');
            setIsPaused(false);
        } catch (error) {
            console.error('Error creating OMG moment:', error);
            alert('Failed to create OMG moment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelStretch = async () => {
        if (!confirm("Are you sure you want to cancel this jungle stretch? Your time won't be logged.")) {
            return;
        }
        try {
            const response = await fetch('/api/cancel-jungle-stretch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: userData.token,
                    stretchId: currentStretchId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to pause jungle stretch');
            }

            setIsJuicingLocal(false);
            setCurrentStretchId(null);
            setStartTime(null);
            setStopTime(null);
            setSelectedVideo(null);
            setDescription('');
            setTimeJungled('0:00');
            setIsPaused(false);
        } catch (error) {
            console.error('Error pausing jungle stretch:', error);
        }
    };

    const handlePauseStretch = async () => {
        if (!confirm("Are you sure you want to pause this jungle stretch?")) {
            return;
        }

        try {
            const response = await fetch('/api/pause-jungle-stretch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: userData.token,
                    stretchId: currentStretchId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to pause jungle stretch');
            }
            setIsPaused(true);
        } catch (error) {
            console.error('Error pausing jungle stretch:', error);
        }
    };

    const handleResumeStretch = async () => {
        if (!confirm("Are you sure you want to resume this jungle stretch?")) {
            return;
        }

        try {
            const response = await fetch('/api/resume-jungle-stretch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: userData.token,
                    stretchId: currentStretchId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to resume jungle stretch');
            }
            const data = await response.json();
            console.log(data.newPauseTime)
            setTotalPauseTimeSeconds(data.newPauseTime)
            setIsPaused(false);
            playCongratsSound();
        } catch (error) {
            console.error('Error resuming jungle stretch:', error);
        }
    };

    return (
        <>
            <audio ref={clickSoundRef} src="./click.mp3" />
            <audio ref={expSoundRef} src="./expSound.mp3" volume="0.5" />
            <audio ref={congratsSoundRef} src="./juicercongrats.mp3" />
            <div 
                onClick={handleWindowClick('gameGuildsWindow')}
                style={{
                    display: "flex", 
                    position: "absolute", 
                    zIndex: isActive ? ACTIVE_Z_INDEX : BASE_Z_INDEX, 
                    width: 400,
                    height: 320,
                    color: 'black',
                    backgroundColor: "#fff", 
                    border: "1px solid #000", 
                    borderRadius: 4,
                    flexDirection: "column",
                    padding: 0,
                    justifyContent: "space-between",
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                    top: "50%",
                    left: "50%",
                    userSelect: "none"
                }}>
                <div 
                    onMouseDown={handleMouseDown('gameGuildsWindow')}
                    style={{
                        display: "flex", 
                        borderBottom: "1px solid #000", 
                        padding: 8, 
                        flexDirection: "row", 
                        justifyContent: "space-between", 
                        cursor: isDragging ? 'grabbing' : 'grab'
                    }}>
                    <div style={{display: "flex", flexDirection: "row", gap: 8}}>
                        <button onClick={(e) => { 
                            e.stopPropagation(); 
                            playClick();
                            handleDismiss('gameGuildsWindow'); 
                        }}>x</button>
                    </div>
                    <p>Jungle (v0.1)</p>
                    <div></div>
                </div>
                <div style={{flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 8}}>
                    {!showExplanation ? (
                        <>
                            <h1 style={{fontSize: 32, lineHeight: 1}}>Jungle (v0.1)</h1>
                            {isJuicing &&
                            <p>Log your time working on a feature then share "OMG IT WORKS" moment when you make it work</p>
                            }
                            <div style={{display: "flex", flexDirection: "column", gap: 4}}>
                                <p>Current Session: {timeJungled}</p>
                                <p>Total Time Foraging: {userData?.totalJungleHours ? 
                                    `${Math.floor(userData.totalJungleHours)} hours ${Math.round((userData.totalJungleHours % 1) * 60)} min` : 
                                    "0 hours 0 min"}</p>
                            </div>
                            
                            <div style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                margin: "10px 0",
                            }}>
                            </div>

                            {!isJuicingLocal &&
                            <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                                <button onClick={() => {
                                    playClick();
                                    handleStartJuicing();
                                }}>
                                    Start Foraging
                                </button>
                                <button onClick={() => {
                                    playClick();
                                    setShowExplanation(true);
                                }}>
                                    What is this?
                                </button>
                            </div>}
                            {isJuicingLocal &&
                            <div style={{padding: 8, display: 'flex', gap: 4, flexDirection: "column", border: "1px solid #000"}}>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="video/*"
                                    style={{ display: 'none' }}
                                />
                                <p 
                                    onClick={handleUploadClick}
                                    style={{
                                        cursor: 'pointer', 
                                        textAlign: "center", 
                                        width: "100%", 
                                        padding: 4, 
                                        border: "1px solid #000", 
                                        textDecoration: 'underline'
                                    }}
                                >
                                    {selectedVideo ? selectedVideo.name : 'Upload Video'}
                                </p>
                                <textarea 
                                    style={{width: "100%", padding: 2}} 
                                    placeholder="wut works?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                                <button 
                                    onClick={() => {
                                        playClick();
                                        handleEndStretch();
                                    }}
                                    disabled={isSubmitting}
                                    style={{width: "100%"}}
                                >
                                    {isSubmitting ? 'Juicing...' : 'End Stretch with your "OMG IT WORKS" moment'}
                                </button>
                                <div style={{width: "100%", display: "flex"}}>
                                    {isPaused ? (
                                        <button 
                                        onClick={() => {
                                            playClick();
                                            handleResumeStretch();
                                        }}
                                        style={{width: "100%", borderRight: "none"}}
                                    >
                                        Resume jungle Stretch
                                    </button>
                                    ) : (
                                         <button 
                                         onClick={() => {
                                             playClick();
                                             handlePauseStretch();
                                         }}
                                         style={{width: "100%", borderRight: "none"}}
                                     >
                                         Pause jungle Stretch
                                     </button>
                                    )}
                                   
                                    <button 
                                        onClick={() => {
                                            playClick();
                                            handleCancelStretch();
                                        }}
                                        style={{width: "100%", backgroundColor: "#ffebee", color: "#d32f2f"}}
                                    >
                                        Cancel jungle Stretch
                                    </button>
                                </div>
                            </div>
                            }
                        </>
                    ) : (
                        <div style={{display: "flex", flexDirection: "column", gap: 16}}>
                            <p>Jungle is a way to gamify your process making mini-ships for your game & to log the time you spend making them. When you start working on your game, open the Jungle app and "Start Foraging". Once you have an "OMG IT WORKS MOMENT" capture that beautiful moment & share it with the Juice community. We'll come and give kudos to congratulate you & you'll get credit for that time :) <br/><br/>The Jungle is how you will earn [CURRENCY] to buy assets for your games and publish them on more platforms.</p>
                            <button onClick={() => {
                                playClick();
                                setShowExplanation(false);
                            }}>
                                Return to Jungle
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 