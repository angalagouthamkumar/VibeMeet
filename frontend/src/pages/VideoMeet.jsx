import React, { useEffect, useRef, useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { io } from "socket.io-client";
// ✅ FIX 1: Import the native router navigation hook from react-router-dom
import { useNavigate } from 'react-router-dom'; 
import "../styles/videoComponent.css";

const server_url = "http://localhost:3000";

const peerConfigConnections = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

const VideoMeet = () => {
    // ✅ FIX 2: Initialize the navigation router action handler engine
    const navigate = useNavigate(); 

    const connections = useRef({});
    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoRef = useRef();
    let messagesEndRef = useRef(); 

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState();
    let [showModal, setShowModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState();
    let [messages, setMessages] = useState([]);
    let [newMessages, setNewMessages] = useState("");
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");
    const [pinnedUser, setPinnedUser] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);

    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);

    const getPermission = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoPermission) {
                setVideoAvailable(true);
                setAudioAvailable(true);
            } else {
                setVideoAvailable(false);
                setAudioAvailable(false);
            }
            if(navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }
            if(videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if(userMediaStream){
                    window.localStream = userMediaStream;
                    if(localVideoRef.current){
                        localVideoRef.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.error("Error accessing media devices.", error);
        }
    };
 
    useEffect(() => {
        getPermission();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    let getUserMediaSuccess = (stream) => {
        try{
            if (window.localStream && window.localStream !== stream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        }
        catch(error){
            console.error("Error stopping tracks:", error);
        }

        window.localStream = stream;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }

        for(let id in connections.current){
            if(id === socketIdRef.current) continue;
            
            const senders = connections.current[id].getSenders();
            stream.getTracks().forEach(track => {
                const sender = senders.find(s => s.track && s.track.kind === track.kind);
                if (sender) {
                    sender.replaceTrack(track);
                } else {
                    connections.current[id].addTrack(track, stream);
                }
            });

            connections.current[id].createOffer()
                .then(description => {
                    connections.current[id].setLocalDescription(description).then(()=>{
                        socketRef.current.emit("signal", id, JSON.stringify({ "sdp": connections.current[id].localDescription }));
                    })
                    .catch(err => {
                        console.error("Error setting local description:", err);
                    });
                });
        }
    };

    let silence = () =>{
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    }

    let black = () => {
        let width = 640;
        let height = 480;
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext("2d").fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    let getUserMedia = () => {
        if((video && videoAvailable) || (audio && audioAvailable) ){
            navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable })
                .then(getUserMediaSuccess)
                .catch(error => {
                    console.error("Error accessing media devices.", error);
                });
        } else {
            try {
                let tracks = localVideoRef.current.srcObject.getTracks();
                tracks.forEach(track => {
                    track.stop();
                });
            } catch (error){
                console.error("Error stopping media tracks.", error);
            }
        }
    };

    useEffect(() => {
        if(!askForUsername && video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [audio, video, askForUsername]);

    let getMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);
        if(fromId !== socketIdRef.current) {
            if(signal.sdp){
                connections.current[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
                    .then(() => {
                        if(signal.sdp.type === "offer") {
                            connections.current[fromId].createAnswer()
                                .then(description => {
                                    connections.current[fromId].setLocalDescription(description)
                                        .then(() => {
                                            socketRef.current.emit("signal", fromId, JSON.stringify({ "sdp": connections.current[fromId].localDescription }));
                                        })
                                        .catch(error => {
                                            console.error("Error setting local description:", error);
                                        });
                                })
                                .catch(error => {
                                    console.error("Error creating answer:", error);
                                });
                        }
                    })
                    .catch(error => {
                        console.error("Error setting remote description:", error);
                    });
            }
            if(signal.ice){
                connections.current[fromId].addIceCandidate(new RTCIceCandidate(signal.ice))
                    .catch(error => {
                        console.error("Error adding ICE candidate:", error);
                    });
            }
        }
    };

    let connectToSocketServer = () => {
        if (socketRef.current) {
            socketRef.current.off("signal");
            socketRef.current.off("connect");
        }

        socketRef.current = io(server_url, {
            transports: ["websocket"],
            reconnection: true
        });

        socketRef.current.on("signal", getMessageFromServer);
        
        socketRef.current.on("connect" ,() =>{
            socketRef.current.emit("join-call", window.location.href);
            socketIdRef.current = socketRef.current.id;
            
            socketRef.current.off("chat-message");
            socketRef.current.off("user-left");
            socketRef.current.off("user-joined");

            socketRef.current.on("chat-message", (msgObj) => {
                const isFromSelf = msgObj["socket-id-sender"] === socketIdRef.current;
                
                if (!isFromSelf) {
                    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    setMessages((prev) => [
                        ...prev,
                        {
                            sender: msgObj.sender || "User",
                            data: msgObj.data,
                            time: currentTime,
                            isSelf: false
                        }
                    ]);
                }
            });
            
            socketRef.current.on("user-left", (id) => {
                setVideos((Videos) => Videos.filter((video) => video.socketId !== id));
                if (connections.current[id]) {
                    connections.current[id].close();
                    delete connections.current[id];
                }
            });

            socketRef.current.on("user-joined",(id, clients) => {
                if (!Array.isArray(clients)) return;
                clients.forEach(socketListId => {
                    if (socketListId === socketIdRef.current) return;

                    if (!connections.current[socketListId]) {
                        connections.current[socketListId] = new RTCPeerConnection(peerConfigConnections);
                        
                        connections.current[socketListId].onicecandidate = (event) => {
                            if (event.candidate !== null) {
                                socketRef.current.emit("signal", socketListId, JSON.stringify({ "ice": event.candidate }));
                            }
                        };
                        
                        connections.current[socketListId].ontrack = (event) => {
                            setVideos(prevVideos => {
                                const videoExists = prevVideos.find(video => video.socketId === socketListId);
                                if(videoExists) {
                                    const updatedVideos = prevVideos.map(video => 
                                        video.socketId === socketListId ? { ...video, stream: event.streams[0] } : video
                                    );
                                    videoRef.current = updatedVideos;
                                    return updatedVideos;
                                } else {
                                    let newVideo = { socketId: socketListId, stream: event.streams[0], autoPlay: true, playsInline: true };
                                    const updatedVideos = [...prevVideos, newVideo];
                                    videoRef.current = updatedVideos;
                                    return updatedVideos;
                                }
                            });
                        };
                        
                        if(window.localStream !== undefined && window.localStream !== null){
                            window.localStream.getTracks().forEach(track => {
                                connections.current[socketListId].addTrack(track, window.localStream);
                            });
                        }else{
                            let blackSilence = new MediaStream([black(), silence()]);
                            blackSilence.getTracks().forEach(track => {
                                connections.current[socketListId].addTrack(track, blackSilence);
                            });
                        }
                    }
                });

                if(id === socketIdRef.current){
                    for(let id2 in connections.current){
                        if(id2 === socketIdRef.current){
                            continue;
                        }
                        connections.current[id2].createOffer().then(description => {
                            connections.current[id2].setLocalDescription(description).then(() => {
                                socketRef.current.emit("signal", id2, JSON.stringify({ "sdp": connections.current[id2].localDescription }));
                            })
                            .catch(err => {
                                console.log("Error setting local description on offer creation:", err);
                            });
                        })
                        .catch(err => {
                            console.log("Error creating offer:", err);
                        });
                    }
                }
            });
        });
    };

    const handleVideoToggle = () => {
        if (window.localStream) {
            const videoTrack = window.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideo(videoTrack.enabled);
            }
        }
    };

    const handleAudioToggle = () => {
        if (window.localStream) {
            const audioTrack = window.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setAudio(audioTrack.enabled);
            }
        }
    };

    const togglePin = (targetId) => {
        setPinnedUser(prev => (prev === targetId ? null : targetId));
        setActiveMenuId(null);
    };

    const removeRemoteUser = (targetSocketId) => {
        setVideos(prevVideos => prevVideos.filter(v => v.socketId !== targetSocketId));
        
        if (connections.current[targetSocketId]) {
            connections.current[targetSocketId].close();
            delete connections.current[targetSocketId];
        }
        
        if (pinnedUser === targetSocketId) {
            setPinnedUser(null);
        }
        setActiveMenuId(null);
    };

    const sendMessage = () => {
        if (newMessages.trim() === "") return;
        
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (socketRef.current) {
            socketRef.current.emit("chat-message", newMessages, username);
        }
        
        setMessages((prev) => [
            ...prev,
            {
                sender: "You",
                data: newMessages,
                time: currentTime,
                isSelf: true
            }
        ]);
        
        setNewMessages("");
    };

    let getDisplayMediaSuccess = (stream) => {
        try{
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        }
        catch(error){
            console.error("Error stopping tracks:", error);
        }
        window.localStream = stream;
        localVideoRef.current.srcObject = stream;

        for(let id in connections.current){
            if(id === socketIdRef.current) continue;
            connections.current[id].addStream(window.localStream);
            connections.current[id].createOffer().then(description => {
                connections.current[id].setLocalDescription(description).then(() => {
                    socketRef.current.emit("signal", id, JSON.stringify({ "sdp": connections.current[id].localDescription }));
                })
                .catch((err) => {
                    console.log(err);
                });
            });
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);
            try {
                let tracks = localVideoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) { console.log(e); }

            let blackSilence = () => new MediaStream([black(), silence()]);
            window.localStream = blackSilence();
            localVideoRef.current.srcObject = window.localStream;

            getUserMedia();
        });
    };
    
    let getDisplayMedia = () => {
        if(screen){
            if(navigator.mediaDevices.getDisplayMedia){
                navigator.mediaDevices.getDisplayMedia({ audio : true ,video: true })
                    .then(getDisplayMediaSuccess)
                    .catch(err => {
                        console.error("Error accessing display media:", err);
                    });
            }
        }
    };

    useEffect(() => {
        if(screen !== undefined) {
            getDisplayMedia();
        }
    }, [screen]);

    let handleScreen = () => {
        setScreen(!screen);
    };

    const getRoomName = () => {
        const segments = window.location.pathname.split('/');
        return segments[segments.length - 1] || "lobby";
    };

    return (
        askForUsername === true ? (
            <div className="lobby-container">
                <div className="lobby-card-wrapper">
                    <h2>Enter your name</h2>
                    <TextField 
                        id="outlined-basic" 
                        label="Name" 
                        value={username}
                        onChange={e => setUsername(e.target.value)} 
                        variant="outlined" 
                        className="lobby-input"
                    />
                    <Button 
                        variant="contained" 
                        className="join-btn"
                        onClick={() => {
                            setAskForUsername(false);
                            connectToSocketServer();
                            setTimeout(() => {
                                if (localVideoRef.current && window.localStream) {
                                    localVideoRef.current.srcObject = window.localStream;
                                }
                            }, 100);
                        }}
                    >
                        Join
                    </Button>
                </div>
            </div>
        ) : (
            <div className="meeting-screen">
                <header className="navbar">
                    <span className="navbar-brand">VibeMeet | Room: {getRoomName()}</span>
                </header>
                
                <div className="meeting-viewport-wrapper">
                    <div className="meeting-container">
                        <div className={`video-grid ${pinnedUser ? 'has-pinned-active' : ''}`}>
                            {pinnedUser ? (
                                <>
                                    <div className="pinned-main-focus-area">
                                        {pinnedUser === 'local' ? (
                                            <div className="local-video-card pinned-mode">
                                                <div className="video-wrapper-inner">
                                                    <video ref={localVideoRef} autoPlay muted playsInline className="local-video-element"></video>
                                                    <div className="local-user-label"><span>You: {username} 📌</span></div>
                                                    <div className="kebab-menu-container">
                                                        <button onClick={() => setActiveMenuId(activeMenuId === 'local' ? null : 'local')} className="kebab-btn">
                                                            <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2.9.1-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                                        </button>
                                                        {activeMenuId === 'local' && (
                                                            <div className="kebab-dropdown-menu">
                                                                <button className="dropdown-item" onClick={() => togglePin('local')}>Unpin</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            (() => {
                                                const pinnedPeer = videos.find(v => v.socketId === pinnedUser);
                                                return pinnedPeer ? (
                                                    <div className="remote-video-card pinned-mode">
                                                        <div className="video-wrapper-inner">
                                                            <video 
                                                                ref={ref => { if(ref && pinnedPeer.stream) ref.srcObject = pinnedPeer.stream; }}
                                                                autoPlay playsInline className="remote-video-element"
                                                            ></video>
                                                            <span className="remote-user-label">User: {pinnedPeer.socketId} 📌</span>
                                                            <div className="kebab-menu-container">
                                                                <button onClick={() => setActiveMenuId(activeMenuId === pinnedPeer.socketId ? null : pinnedPeer.socketId)} className="kebab-btn">
                                                                    <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2.9.1-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                                                </button>
                                                                {activeMenuId === pinnedPeer.socketId && (
                                                                    <div className="kebab-dropdown-menu">
                                                                        <button className="dropdown-item" onClick={() => togglePin(pinnedPeer.socketId)}>Unpin</button>
                                                                        <button className="dropdown-item danger-action" onClick={() => removeRemoteUser(pinnedPeer.socketId)}>Remove user</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })()
                                        )}
                                    </div>

                                    <div className="unpinned-sidebar-gallery">
                                        {pinnedUser !== 'local' && (
                                            <div className="local-video-card">
                                                <div className="video-wrapper-inner">
                                                    <video ref={localVideoRef} autoPlay muted playsInline className="local-video-element"></video>
                                                    <div className="local-user-label"><span>You: {username}</span></div>
                                                    <div className="kebab-menu-container">
                                                        <button onClick={() => setActiveMenuId(activeMenuId === 'local' ? null : 'local')} className="kebab-btn">
                                                            <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2.9.1-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                                        </button>
                                                        {activeMenuId === 'local' && (
                                                            <div className="kebab-dropdown-menu">
                                                                <button className="dropdown-item" onClick={() => togglePin('local')}>Pin</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {videos.filter(v => v.socketId !== pinnedUser).map((video) => (
                                            <div className="remote-video-card" key={video.socketId}>
                                                <div className="video-wrapper-inner">
                                                    <video 
                                                        ref={ref => { if(ref && video.stream) ref.srcObject = video.stream; }}
                                                        autoPlay playsInline className="remote-video-element"
                                                    ></video>
                                                    <span className="remote-user-label">User: {video.socketId}</span>
                                                    <div className="kebab-menu-container">
                                                        <button onClick={() => setActiveMenuId(activeMenuId === video.socketId ? null : video.socketId)} className="kebab-btn">
                                                            <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2.9.1-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                                        </button>
                                                        {activeMenuId === video.socketId && (
                                                            <div className="kebab-dropdown-menu">
                                                                <button className="dropdown-item" onClick={() => togglePin(video.socketId)}>Pin</button>
                                                                <button className="dropdown-item danger-action" onClick={() => removeRemoteUser(video.socketId)}>Remove user</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="local-video-card">
                                        <div className="video-wrapper-inner">
                                            <video ref={localVideoRef} autoPlay muted playsInline className="local-video-element"></video>
                                            <div className="local-user-label"><span>You: {username}</span></div>
                                            <div className="kebab-menu-container">
                                                <button onClick={() => setActiveMenuId(activeMenuId === 'local' ? null : 'local')} className="kebab-btn">
                                                    <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2.9.1-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                                </button>
                                                {activeMenuId === 'local' && (
                                                    <div className="kebab-dropdown-menu">
                                                        <button className="dropdown-item" onClick={() => togglePin('local')}>Pin</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {videos.map((video) => (
                                        <div className="remote-video-card" key={video.socketId}>
                                            <div className="video-wrapper-inner">
                                                <video 
                                                    ref={ref => { if(ref && video.stream) ref.srcObject = video.stream; }}
                                                    autoPlay playsInline className="remote-video-element"
                                                ></video>
                                                <span className="remote-user-label">User: {video.socketId}</span>
                                                <div className="kebab-menu-container">
                                                    <button onClick={() => setActiveMenuId(activeMenuId === video.socketId ? null : video.socketId)} className="kebab-btn">
                                                        <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2.9.1-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                                    </button>
                                                    {activeMenuId === video.socketId && (
                                                        <div className="kebab-dropdown-menu">
                                                            <button className="dropdown-item" onClick={() => togglePin(video.socketId)}>Pin</button>
                                                            <button className="dropdown-item danger-action" onClick={() => removeRemoteUser(video.socketId)}>Remove user</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    <aside className={`side-chat-panel ${showModal ? 'visible' : ''}`}>
                        <div className="chat-panel-header">
                            <h3>In-call messages</h3>
                            <button className="chat-close-btn" onClick={() => setShowModal(false)}>
                                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                            </button>
                        </div>
                        <div className="chat-panel-info-alert">
                            Messages can only be seen by people in the call and are deleted when the call ends.
                        </div>
                        
                        <div className="chat-messages-scroll-zone">
                            {messages.map((msg, index) => (
                                <div key={index} className={`chat-message-bubble-row ${msg.isSelf ? 'align-self-right' : ''}`}>
                                    {!msg.isSelf && <span className="chat-bubble-username">{msg.sender}</span>}
                                    
                                    <div className="chat-bubble-text-content">
                                        {msg.data}
                                        <span className="chat-bubble-timestamp">{msg.time}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-panel-footer-input">
                            <input 
                                type="text" 
                                placeholder="Send a message to everyone"
                                value={newMessages}
                                onChange={(e) => setNewMessages(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                            />
                            <button className="chat-send-btn" onClick={sendMessage} disabled={newMessages.trim() === ""}>
                                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </button>
                        </div>
                    </aside>
                </div>

                <footer className="bottom-dockbar">
                    <div className="dock-left-info">
                        <span>{getRoomName()}</span>
                    </div>

                    <div className="dock-center-controls">
                        <div className="btn-tooltip-wrapper">
                            <button onClick={handleAudioToggle} className={`dock-btn ${!audio ? 'disabled' : ''}`}>
                                {audio ? (
                                    <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.92 1.92c-.77.53-1.63.84-2.58.91V21h-2v-3.28c-3.28-.48-6-3.3-6-6.72H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9l4.19 4.19 1.27-1.27L4.27 3z"/></svg>
                                )}
                            </button>
                            <span className="tooltip-text">{audio ? "Turn off microphone" : "Turn on microphone"}</span>
                        </div>

                        <div className="btn-tooltip-wrapper">
                            <button onClick={handleVideoToggle} className={`dock-btn ${!video ? 'disabled' : ''}`}>
                                {video ? (
                                    <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24"><path d="M18 10.48V6c0-1.1-.9-2-2-2H6.83l2 2H16v7.17l2 2v-1.19l4 4v-11l-4 3.51zM2.81 2.81L1.39 4.22 8 10.83V18c0 1.1.9 2 2 2h8c.36 0 .68-.1.97-.26l2.81 2.81 1.41-1.41L2.81 2.81zM10 18v-5.17l5.17 5.17H10z"/></svg>
                                )}
                            </button>
                            <span className="tooltip-text">{video ? "Turn off camera" : "Turn on camera"}</span>
                        </div>

                        <div className="btn-tooltip-wrapper">
                            <button onClick={handleScreen} className={`dock-btn ${screen ? 'disabled' : ''}`}>
                                <svg viewBox="0 0 24 24"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>
                            </button>
                            <span className="tooltip-text">{screen ? "Stop presenting" : "Present now"}</span>
                        </div>

                        <div className="btn-tooltip-wrapper">
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (socketRef.current) {
                                        try{
                                            socketRef.current.disconnect();
                                        } catch (error) {
                                            console.error("Error disconnecting socket:", error);
                                        }
                                        socketRef.current.disconnect();
                                    }
                                    
                                    navigate("/home");
                                }} 
                                className="dock-btn exit"
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 9c-2.2 0-4.3.4-6.2 1.1-.6.2-1 .7-1 1.3v3c0 .6.4 1.1 1 1.1 1.3-.4 2.7-.7 4.2-.7V9.5c.6-.1 1.2-.2 2-.2s1.4.1 2 .2v5.3c1.5 0 2.9.3 4.2.7.6 0 1-.5 1-1.1v-3c0-.6-.4-1.1-1-1.3C16.3 9.4 14.2 9 12 9z"/>
                                </svg>
                            </button>
                        <span className="tooltip-text">Leave call</span>
                    </div>
                    </div>

                    <div className="dock-right-actions">
                        <div className="btn-tooltip-wrapper">
                            <button onClick={() => setShowModal(!showModal)} className={`dock-btn ${showModal ? 'disabled' : ''}`}>
                                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                            </button>
                            <span className="tooltip-text">Chat with everyone</span>
                        </div>
                    </div>
                </footer>
            </div>
        )
    );
};

export default VideoMeet;