import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import LogoutIcon from '@mui/icons-material/Logout';
import Avatar from '@mui/material/Avatar';

function HomeComponent() {
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const [meetingCode, setMeetingCode] = useState('');
    const [meetingHistory, setMeetingHistory] = useState([]);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const [username, setUsername] = useState(() => {
        return localStorage.getItem('vibeMeet_name') || localStorage.getItem('username') || "Guest";
    });

    useEffect(() => {
        const storedHistory = JSON.parse(localStorage.getItem('vibeMeet_history')) || [];
        setMeetingHistory(storedHistory);

       
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const saveToHistory = (roomId) => {
        const currentTime = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: 'short'
        });
        const newEntry = { roomId, time: currentTime };
        const updatedHistory = [
            newEntry, 
            ...meetingHistory.filter(item => item.roomId !== roomId)
        ].slice(0, 5);

        setMeetingHistory(updatedHistory);
        localStorage.setItem('vibeMeet_history', JSON.stringify(updatedHistory));
    };

    const handleJoinVideoCall = () => {
        if (meetingCode.trim() === "") return;
        const formattedCode = meetingCode.trim().replace(/\s+/g, '-');
        saveToHistory(formattedCode);
        navigate(`/${formattedCode}`);
    };

    const handleCreateNewCall = () => {
        const randomCode = Math.random().toString(36).substring(2, 7) + '-' + Math.random().toString(36).substring(2, 7);
        saveToHistory(randomCode);
        navigate(`/${randomCode}`);
    };

    const handleClearHistory = () => {
        setMeetingHistory([]);
        localStorage.removeItem('vibeMeet_history');
    };

    const handleLogout = () => {
        
        localStorage.removeItem('vibeMeet_history'); 

        navigate('/home'); 
        window.location.reload();
    };

    return (
        <div className="home-dashboard-screen">
            <header className="home-navbar">
                <div className="home-nav-brand">
                    <KeyboardCommandKeyIcon className="brand-icon" />
                    <span>VibeMeet</span>
                </div>

                
                <div className="navbar-profile-wrapper" ref={dropdownRef}>
                    <div 
                        className={`profile-trigger-zone ${showProfileMenu ? 'active' : ''}`}
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                    >
                        <Avatar className="navbar-default-avatar">
                            {username.charAt(0).toUpperCase()}
                        </Avatar>
                        <span className="navbar-username-label">{username}</span>
                    </div>

                   
                    {showProfileMenu && (
                        <div className="profile-glass-dropdown">
                            <div className="dropdown-user-details">
                                <span className="user-email-meta">Logged in as</span>
                                <h4>{username}</h4>
                            </div>
                            <div className="dropdown-divider-bar" />
                            <button className="dropdown-logout-action-btn" onClick={handleLogout}>
                                <LogoutIcon className="logout-icon-svg" />
                                <span>Sign out</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="home-hero-container">
                <div className="home-glass-card">
                    <div className="card-header-block">
                        <h1>Premium video meetings.</h1>
                        <h1>Now free for everyone.</h1>
                        <p>Connect, collaborate, and celebrate from anywhere with crystal clear streaming grids.</p>
                    </div>

                    <div className="card-action-utilities">
                        <Button 
                            variant="contained" 
                            className="create-call-btn"
                            startIcon={<VideoCallIcon />}
                            onClick={handleCreateNewCall}
                        >
                            New meeting
                        </Button>

                        <div className="input-join-inline-group">
                            <TextField 
                                placeholder="Enter a code or link" 
                                value={meetingCode}
                                onChange={e => setMeetingCode(e.target.value)} 
                                variant="outlined" 
                                className="home-code-input"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleJoinVideoCall(); }}
                            />
                            <Button 
                                className="join-call-action-link"
                                onClick={handleJoinVideoCall}
                                disabled={meetingCode.trim() === ""}
                            >
                                Join
                            </Button>
                        </div>
                    </div>

                    <div className="card-divider-line" />
                    
                    <div className="history-section">
                        <div className="history-header">
                            <div className="history-title">
                                <HistoryIcon className="history-icon-badge" />
                                <h3>Recent Meetings</h3>
                            </div>
                            {meetingHistory.length > 0 && (
                                <button className="clear-history-btn" onClick={handleClearHistory}>
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="history-list-container">
                            {meetingHistory.length > 0 ? (
                                meetingHistory.map((item, index) => (
                                    <div 
                                        key={index} 
                                        className="history-item-row"
                                        onClick={() => {
                                            saveToHistory(item.roomId);
                                            navigate(`/${item.roomId}`);
                                        }}
                                    >
                                        <div className="history-room-info">
                                            <MeetingRoomIcon className="row-room-icon" />
                                            <span className="history-room-id">{item.roomId}</span>
                                        </div>
                                        <div className="history-time-info">
                                            <AccessTimeIcon className="row-time-icon" />
                                            <span>{item.time}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="history-empty-state">
                                    No recent video calls found
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card-divider-line" />
                </div>
            </main>
        </div>
    );
}

export default HomeComponent;