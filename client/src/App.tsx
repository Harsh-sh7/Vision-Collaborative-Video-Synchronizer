import React, { useState, useEffect } from 'react';
import './App.css';
import type { RoomDetails } from './shared/types';

function App() {
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeRoom, setActiveRoom] = useState<RoomDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New Features States
  const [myUserId, setMyUserId] = useState('');
  const [openTabs, setOpenTabs] = useState<chrome.tabs.Tab[]>([]);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // YouTube / File share modes
  const [shareType, setShareType] = useState<'FILE' | 'YT'>('FILE');
  const [ytLink, setYtLink] = useState('');


  const SERVER_URL = 'https://vision-collaborative-video-synchronizer.onrender.com';

  useEffect(() => {
    // 1. Fetch initial session details from Background Worker
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response: any) => {
      if (response) {
        if (response.displayName && response.userToken) {
          setDisplayName(response.displayName);
          setIsAuthenticated(true);
        }
        if (response.activeRoom) {
          setActiveRoom(response.activeRoom);
        }
        if (response.userId) {
          setMyUserId(response.userId);
        }
      }
    });

    // 2. Query open browser tabs
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        setOpenTabs(tabs);
      });
    }

    // 3. Listen to real-time events sent from Background Worker
    const handleMessages = (msg: any) => {
      if (msg.type === 'ROOM_STATE_UPDATED') {
        setActiveRoom(msg.payload);
        // Force update user session to resolve local user authority
        chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res: any) => {
          if (res && res.userId) {
            setMyUserId(res.userId);
          }
        });
      } else if (msg.type === 'DOWNLOAD_PROGRESS') {
        setDownloadProgress(msg.payload.progress);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessages);
    return () => chrome.runtime.onMessage.removeListener(handleMessages);
  }, []);

  // Update download progress based on room activeUrl updates
  useEffect(() => {
    if (!activeRoom || !activeRoom.activeUrl) {
      setDownloadProgress(0);
    }
  }, [activeRoom?.activeUrl]);

  // Handle Onboarding / Authentication
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (data.token) {
        setIsAuthenticated(true);
        // Save auth data in background session
        chrome.storage.local.set({ displayName, userToken: data.token }, () => {
          chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response: any) => {
            if (response && response.userId) {
              setMyUserId(response.userId);
            }
          });
        });
      } else {
        setErrorMsg(data.message || 'Registration failed');
      }
    } catch (err: any) {
      setErrorMsg('Failed to connect to backend service.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create Room
  const handleCreateRoom = () => {
    setIsLoading(true);
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (session) => {
      if (session && session.userToken) {
        chrome.runtime.sendMessage(
          {
            type: 'CREATE_ROOM',
            payload: { displayName: session.displayName, token: session.userToken },
          },
          (response) => {
            setIsLoading(false);
            if (response && response.success) {
              chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (sessionResponse: any) => {
                if (sessionResponse) {
                  if (sessionResponse.userId) setMyUserId(sessionResponse.userId);
                  if (sessionResponse.activeRoom) setActiveRoom(sessionResponse.activeRoom);
                }
              });
            } else if (response) {
              setErrorMsg(response.error || 'Failed to create room.');
            }
          }
        );
      }
    });
  };

  // Join Room
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, async (session) => {
      let activeToken = session?.userToken;
      let activeName = session?.displayName || displayName;

      // Register guest if profile doesn't exist
      if (!activeToken) {
        try {
          const guestName = displayName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
          const authRes = await fetch(`${SERVER_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: guestName }),
          });
          const authData = await authRes.json();
          activeToken = authData.token;
          activeName = guestName;
          setDisplayName(guestName);
          setIsAuthenticated(true);
        } catch (err) {
          setErrorMsg('Failed to initialize session guest authorization.');
          setIsLoading(false);
          return;
        }
      }

      chrome.runtime.sendMessage(
        {
          type: 'JOIN_ROOM',
          payload: { joinDisplayName: activeName, joinCode: roomCode, joinToken: activeToken },
        },
        (response) => {
          setIsLoading(false);
          if (response && response.success) {
            chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (sessionResponse: any) => {
              if (sessionResponse) {
                if (sessionResponse.userId) setMyUserId(sessionResponse.userId);
                if (sessionResponse.activeRoom) setActiveRoom(sessionResponse.activeRoom);
              }
            });
          } else if (response) {
            setErrorMsg(response.error || 'Failed to join room.');
          }
        }
      );
    });
  };

  // Leave Room
  const handleLeaveRoom = () => {
    chrome.runtime.sendMessage({ type: 'LEAVE_ROOM' }, () => {
      setActiveRoom(null);
      setDownloadProgress(0);
    });
  };

  // Handle Tab Selection (Host)
  const handleShareTab = (url: string, title: string) => {
    chrome.runtime.sendMessage({
      type: 'SHARE_TAB',
      payload: { activeUrl: url, activeTitle: title },
    });
  };

  const handleRunPlayer = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const playerUrl = chrome.runtime.getURL('player.html');
      chrome.tabs.query({}, (tabs) => {
        const existingTab = tabs.find((t) => t.url === playerUrl);
        if (existingTab && existingTab.id !== undefined) {
          chrome.tabs.update(existingTab.id, { active: true });
          if (existingTab.windowId !== undefined) {
            chrome.windows.update(existingTab.windowId, { focused: true });
          }
        } else {
          chrome.tabs.create({ url: playerUrl });
        }
      });
    }
  };

  // Handle YouTube Link Submit
  const handleYtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytLink.trim()) return;

    let videoId = ytLink;
    try {
      const url = new URL(ytLink);
      if (url.hostname === 'youtu.be') {
        videoId = url.pathname.slice(1);
      } else {
        videoId = url.searchParams.get('v') || ytLink;
      }
    } catch (err) {}

    const videoTitle = `YouTube Video (${videoId})`;
    chrome.runtime.sendMessage({
      type: 'LOCAL_VIDEO_SHARE',
      payload: { fileName: videoTitle, fileSize: 100 * 1024 * 1024 },
    });
    
    // Redirect host immediately to the player tab
    handleRunPlayer();
  };

  const handleHostWatchClick = () => {
    handleRunPlayer();
    chrome.runtime.sendMessage({ type: 'HOST_START_WATCHING' });
  };

  const handleChangeVideo = () => {
    chrome.runtime.sendMessage({
      type: 'LOCAL_VIDEO_SHARE',
      payload: { fileName: '', fileSize: 0 }
    });
    setYtLink('');
    setShareType('YT');
  };

  const handleToggleCollabMode = (val: boolean) => {
    if (activeRoom) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_ROOM_SETTINGS',
        payload: { collaborativeMode: val },
      });
    }
  };

  const copyRoomCode = () => {
    if (!activeRoom) return;
    const inviteLink = `${SERVER_URL}/join?room=${activeRoom.roomCode}`;
    navigator.clipboard.writeText(inviteLink);
    alert('Invite link copied to clipboard!');
  };

  // --- RENDERING SCREENS ---

  // Onboarding Screen
  if (!isAuthenticated) {
    return (
      <div className="popup-container flex-column">
        <header className="popup-header">
          <span className="logo-text">Universal Watch Party</span>
        </header>

        <main className="popup-main flex-grow flex-column justify-center align-center">
          <div className="card glass-card fade-in full-width">
            <h2 className="title text-center">Setup Profile</h2>
            <form onSubmit={handleRegister} className="flex-column full-width gap-15">
              <input
                type="text"
                placeholder="Your name"
                className="input-field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
                required
              />

              {errorMsg && <p className="error-text">{errorMsg}</p>}

              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Connecting...' : 'Join Platform'}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Room Screen (Active Session)
  if (activeRoom) {
    const isHost = activeRoom.hostId === myUserId;

    // Detect YouTube vs Local Active Video
    const isYtActive = activeRoom.activeUrl?.includes('YouTube Video') || activeRoom.activeUrl?.includes('youtube.com') || activeRoom.activeUrl?.includes('youtu.be');
    const isLocalActive = activeRoom.activeUrl?.startsWith('local://') && activeRoom.activeUrl !== 'local://' && !isYtActive;
    const isVideoActive = activeRoom.activeUrl && activeRoom.activeUrl !== 'local://';
    const isReadyToPlay = downloadProgress >= 40;

    return (
      <div className="popup-container flex-column room-view-layout">
        <header className="popup-header flex-row justify-between align-center">
          <div className="room-code-badge" onClick={copyRoomCode} title="Click to copy invite link">
            <span>Room Code: <strong>{activeRoom.roomCode}</strong></span>
            <svg className="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleLeaveRoom}>Leave</button>
        </header>

        <main className="popup-main room-layout-main flex-grow">
          {/* Top Panel: Cursors / Statuses */}
          <div className="section-panel participant-panel">
            <h3 className="section-title">Participants ({activeRoom.participants.length})</h3>
            <div className="participant-chips flex-row flex-wrap">
              {activeRoom.participants.map((p) => (
                <div key={p.userId} className="user-chip">
                  <span className={`status-dot ${p.presence.toLowerCase()}`} />
                  <span className="chip-name">{p.displayName}</span>
                  {p.userId === activeRoom.hostId && <span className="role-tag">Host</span>}
                </div>
              ))}
            </div>
          </div>


          {/* Control Mode Gating Panels */}
          {isHost && (
            <div className="section-panel gating-panel flex-column">
              <h3 className="section-title">Gating Authority</h3>
              <div className="flex-row gap-10">
                <button
                  className={`btn flex-grow btn-sm ${!activeRoom.collaborativeMode ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleToggleCollabMode(false)}
                >
                  🔒 Host Only
                </button>
                <button
                  className={`btn flex-grow btn-sm ${activeRoom.collaborativeMode ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleToggleCollabMode(true)}
                >
                  🤝 Collaborative
                </button>
              </div>
            </div>
          )}

          {/* Share Tab Panel */}
          {isHost && (
            <div className="section-panel share-panel flex-column">
              <h3 className="section-title">Share Browser Tab</h3>
              <select
                className="input-field select-field"
                onChange={(e) => {
                  const target = openTabs.find((t) => t.url === e.target.value);
                  if (target && target.url && target.title) {
                    handleShareTab(target.url, target.title);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select tab to share</option>
                {openTabs.filter(t => t.url && t.title).map((t, idx) => (
                  <option key={idx} value={t.url}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sync Movie Player Control */}
          <div className="section-panel local-share-panel flex-column">
            <h3 className="section-title">Sync Movie Player</h3>
            
            {!isVideoActive && isHost && (
              <div className="flex-column full-width mt-5">
                <div className="flex-row justify-around align-center mb-10" style={{ gap: '8px' }}>
                  <button
                    className={`btn btn-sm ${shareType === 'FILE' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '4px', fontSize: '10px' }}
                    onClick={() => setShareType('FILE')}
                  >
                    🎬 Local Movie
                  </button>
                  <button
                    className={`btn btn-sm ${shareType === 'YT' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '4px', fontSize: '10px' }}
                    onClick={() => setShareType('YT')}
                  >
                    📺 YouTube Link
                  </button>
                </div>

                {shareType === 'FILE' ? (
                  <div className="flex-row justify-between align-center full-width">
                    <span className="progress-status-text">Open player to drop local movie.</span>
                    <button className="btn btn-secondary btn-sm" onClick={handleRunPlayer}>
                      Open Player
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleYtSubmit} className="flex-row full-width gap-5">
                    <input
                      type="text"
                      placeholder="Paste YouTube Link..."
                      className="input-field flex-grow"
                      style={{ padding: '6px', fontSize: '11px', margin: 0 }}
                      value={ytLink}
                      onChange={(e) => setYtLink(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 10px' }}>
                      Prepare
                    </button>
                  </form>
                )}
              </div>
            )}

            {isVideoActive ? (
              <div className="flex-column full-width mt-5">
                <span className="shared-file-title truncate-text" style={{ fontSize: '11px', color: 'var(--presence-ready)' }}>
                  {isYtActive ? '📺 YouTube Active: ' : '🎬 Video Active: '} 
                  {activeRoom.activeUrl?.replace('local://', '')}
                </span>
                
                {!isHost && isLocalActive && (
                  <div className="progress-bar-container mt-10">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                )}
                
                <div className="flex-row justify-between align-center full-width mt-10">
                  {!isHost ? (
                    <span className="progress-status-text">
                      {isYtActive ? (
                        '✓ Ready to Watch'
                      ) : (
                        !isReadyToPlay
                          ? `⏳ Downloading: ${downloadProgress}%`
                          : (downloadProgress < 100
                              ? `⚡ Ready! Syncing: ${downloadProgress}%`
                              : '✓ Download Complete (100%)')
                      )}
                    </span>
                  ) : (
                    <span className="progress-status-text" style={{ color: 'var(--presence-online)' }}>
                      ✓ Video share active
                    </span>
                  )}
                  
                  {isHost ? (
                    <div className="flex-row gap-5">
                      <button className="btn btn-secondary btn-sm" onClick={handleChangeVideo}>
                        Change Video
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={handleHostWatchClick}>
                        Start Watch Party
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={handleRunPlayer}
                      disabled={isLocalActive && !isReadyToPlay}
                    >
                      Open Player
                    </button>
                  )}
                </div>
              </div>
            ) : (
              !isHost && (
                <div className="flex-row justify-between align-center full-width mt-5">
                  <span className="progress-status-text">
                    ⏳ Host is preparing synchronized video...
                  </span>
                </div>
              )
            )}
          </div>
        </main>
      </div>
    );
  }

  // Home Screen (Authenticated but not in a Room)
  return (
    <div className="popup-container flex-column">
      <header className="popup-header flex-row justify-between align-center">
        <span className="logo-text">Universal Watch Party</span>
        <span className="user-profile-badge">👋 {displayName}</span>
      </header>

      <main className="popup-main flex-grow flex-column justify-center align-center">
        <div className="card glass-card fade-in full-width">
          <h2 className="title text-center">Start Watching</h2>

          <div className="flex-column full-width gap-15">
            <button className="btn btn-primary" onClick={handleCreateRoom} disabled={isLoading}>
              {isLoading ? 'Creating Room...' : 'Create Watch Room'}
            </button>

            <div className="divider flex-row justify-center align-center">
              <span className="divider-text">OR JOIN ONE</span>
            </div>

            <form onSubmit={handleJoinRoom} className="flex-row full-width">
              <input
                type="text"
                placeholder="Room code"
                className="input-field flex-grow join-code-input"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                maxLength={10}
                required
              />
              <button type="submit" className="btn btn-secondary join-btn" disabled={isLoading}>
                {isLoading ? 'Joining...' : 'Join'}
              </button>
            </form>

            {errorMsg && <p className="error-text text-center">{errorMsg}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
