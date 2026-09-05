import React, { useState, useEffect } from 'react';
import { Shield, HardDrive, Users, PlusCircle, LogIn, LogOut, Key, UserCheck, RefreshCw, AlertCircle, Eye, EyeOff, Lock, Check } from 'lucide-react';

const BACKEND_URL = 'http://localhost:8000';
const CLIENT_ID = '338846147570-nqc50noev8fn4ma36hrpgaltq7jr43k4.apps.googleusercontent.com';

export default function App() {
  const [userNameInput, setUserNameInput] = useState('Mukesh');
  const [appJwt, setAppJwt] = useState(() => localStorage.getItem('app_jwt') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms', 'create_join', 'profile'
  const [error, setError] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);

  // Rooms state
  const [myRooms, setMyRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [inspectedUser, setInspectedUser] = useState(null);

  // Forms state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomPassword, setJoinRoomPassword] = useState('');

  // Load Google Identity Services SDK
  useEffect(() => {
    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      setIsGsiLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGsiLoaded(true);
    script.onerror = () => setError('Failed to load Google SDK');
    document.body.appendChild(script);
  }, []);

  // Fetch current profile if JWT exists
  useEffect(() => {
    if (appJwt) {
      fetchMyProfile();
      fetchMyRooms();
    } else {
      setCurrentUser(null);
      setMyRooms([]);
      setSelectedRoom(null);
    }
  }, [appJwt]);

  const showToast = (msg) => {
    setInfoMsg(msg);
    setTimeout(() => setInfoMsg(null), 3000);
  };

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleGoogleAuth = (mode) => { // mode: 'signup' or 'login'
    setError(null);
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      setError('Google Identity Services SDK is not ready yet');
      return;
    }

    try {
      const codeClient = window.google.accounts.oauth2.initCodeClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
        ux_mode: 'popup',
        callback: async (response) => {
          if (response.error) {
            setError(`Google auth failed: ${response.error_description || response.error}`);
            return;
          }

          if (response.code) {
            try {
              const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
              const bodyPayload = mode === 'signup'
                ? { code: response.code, name: userNameInput || 'User' }
                : { code: response.code };

              const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
              });

              const data = await res.json();
              if (res.ok) {
                setAppJwt(data.access_token);
                setCurrentUser(data.user);
                localStorage.setItem('app_jwt', data.access_token);
                showToast(mode === 'signup' ? 'Account created successfully!' : 'Log-in successful!');
                console.log(`[Backend ${mode} Response]:`, data);
              } else {
                setError(`Backend Error: ${data.detail || 'Authentication failed'}`);
              }
            } catch (err) {
              setError(`Network error connecting to backend: ${err.message}`);
            }
          }
        }
      });

      codeClient.requestCode();
    } catch (err) {
      setError(`Failed to launch Google popup: ${err.message}`);
    }
  };

  const handleLogout = () => {
    setAppJwt(null);
    setCurrentUser(null);
    localStorage.removeItem('app_jwt');
    showToast('Logged out');
  };

  const fetchMyProfile = async () => {
    if (!appJwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data);
      } else {
        if (res.status === 401) handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyRooms = async () => {
    if (!appJwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMyRooms(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomPassword.trim()) {
      setError('Room name and password are required');
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ name: newRoomName, password: newRoomPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Created room "${data.name}"!`);
        setNewRoomName('');
        setNewRoomPassword('');
        fetchMyRooms();
        setActiveTab('rooms');
      } else {
        setError(data.detail || 'Failed to create room');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinRoomId.trim() || !joinRoomPassword.trim()) {
      setError('Room ID and password are required');
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${joinRoomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ password: joinRoomPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Joined room!');
        setJoinRoomId('');
        setJoinRoomPassword('');
        fetchMyRooms();
        setActiveTab('rooms');
      } else {
        setError(data.detail || 'Failed to join room');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const selectRoom = async (room) => {
    setSelectedRoom(room);
    setInspectedUser(null);
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${room.id}/users`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRoomMembers(data);
      } else {
        setError(data.detail || 'Failed to fetch room members');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const inspectUserInRoom = async (userId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      const data = await res.json();
      if (res.ok) {
        setInspectedUser(data);
      } else {
        setError(data.detail || 'Failed to fetch user details');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to permanently delete your account? This will revoke your Google token, transfer room ownership if needed, and purge your user record.")) {
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Account successfully deleted');
        handleLogout();
      } else {
        setError(data.detail || 'Failed to delete account');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        {/* Header */}
        <div className="header">
          <div className="logo-badge">
            <Users size={26} />
          </div>
          <div className="header-text" style={{ flexGrow: 1 }}>
            <h1>FastAPI Private Rooms & OAuth</h1>
            <p>Google Identity Code Flow + Custom JWT + SQLite Private Rooms</p>
          </div>
          {currentUser && (
            <button className="btn btn-secondary" onClick={handleLogout} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
              <LogOut size={16} /> Logout
            </button>
          )}
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="toast toast-error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {infoMsg && (
          <div className="toast toast-info" style={{ marginBottom: '1rem' }}>
            <Check size={18} />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Unauthenticated Login Screen */}
        {!appJwt ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group">
              <label htmlFor="user-name">Display Name (Only used for first-time signup)</label>
              <input
                id="user-name"
                type="text"
                className="input-field"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                placeholder="Enter your name (optional)"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleGoogleAuth('signup')}
                disabled={!isGsiLoaded}
                style={{ flex: 1 }}
              >
                <PlusCircle size={18} />
                {isGsiLoaded ? 'Sign Up (New User)' : 'Loading Google SDK...'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => handleGoogleAuth('login')}
                disabled={!isGsiLoaded}
                style={{ flex: 1 }}
              >
                <LogIn size={18} />
                {isGsiLoaded ? 'Log In (Existing User)' : 'Loading Google SDK...'}
              </button>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div>
            {/* Nav Tabs */}
            <div className="scope-pills" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`scope-pill ${activeTab === 'rooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                <Users size={14} style={{ marginRight: '4px' }} /> Participating Rooms ({myRooms.length})
              </button>

              <button
                className={`scope-pill ${activeTab === 'create_join' ? 'active' : ''}`}
                onClick={() => setActiveTab('create_join')}
              >
                <PlusCircle size={14} style={{ marginRight: '4px' }} /> Create / Join Room
              </button>

              <button
                className={`scope-pill ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <UserCheck size={14} style={{ marginRight: '4px' }} /> My Profile
              </button>
            </div>

            {/* TAB 1: Participating Rooms */}
            {activeTab === 'rooms' && (
              <div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Your Rooms</h3>
                {myRooms.length === 0 ? (
                  <div className="drive-results" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    You haven't joined any rooms yet. Click <strong>Create / Join Room</strong> tab to start!
                  </div>
                ) : (
                  <div className="file-list" style={{ marginBottom: '1.5rem' }}>
                    {myRooms.map((room) => (
                      <div
                        key={room.id}
                        className="file-item"
                        style={{
                          cursor: 'pointer',
                          borderColor: selectedRoom?.id === room.id ? 'var(--accent-blue)' : 'var(--border-color)',
                          background: selectedRoom?.id === room.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          padding: '0.75rem 1rem'
                        }}
                        onClick={() => selectRoom(room)}
                      >
                        <Lock size={16} color="var(--accent-cyan)" />
                        <span style={{ fontWeight: 600, flexGrow: 1, color: 'var(--text-primary)' }}>{room.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room ID: #{room.id}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Room Details */}
                {selectedRoom && (
                  <div className="drive-results" style={{ marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>
                      Room #{selectedRoom.id}: {selectedRoom.name}
                    </h3>

                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Participating Members ({roomMembers.length}):
                    </h4>
                    <div className="file-list">
                      {roomMembers.map((member) => (
                        <div
                          key={member.id}
                          className="file-item"
                          style={{ cursor: 'pointer', padding: '0.6rem 0.8rem' }}
                          onClick={() => inspectUserInRoom(member.id)}
                        >
                          <UserCheck size={14} color="var(--accent-emerald)" />
                          <span style={{ flexGrow: 1, fontWeight: 500 }}>{member.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{member.email}</span>
                        </div>
                      ))}
                    </div>

                    {/* Inspected User Profile */}
                    {inspectedUser && (
                      <div className="token-box" style={{ marginTop: '1rem', background: 'rgba(0, 0, 0, 0.5)' }}>
                        <div className="token-header">
                          <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                            Selected Member Details
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div><strong>User ID:</strong> #{inspectedUser.id}</div>
                          <div><strong>Name:</strong> {inspectedUser.name}</div>
                          <div><strong>Gmail:</strong> {inspectedUser.email}</div>
                          <div><strong>Drive Storage Used:</strong> {formatBytes(inspectedUser.storage_usage)}</div>
                          <div><strong>Drive Storage Total:</strong> {inspectedUser.storage_limit ? formatBytes(inspectedUser.storage_limit) : 'Unlimited / Unset'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Create / Join Room */}
            {activeTab === 'create_join' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Create Room Form */}
                <form onSubmit={handleCreateRoom} className="drive-results">
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Create New Room</h3>
                  <div className="input-group">
                    <label>Room Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Study Group"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Password</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Enter room password"
                      value={newRoomPassword}
                      onChange={(e) => setNewRoomPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <PlusCircle size={16} /> Create Room
                  </button>
                </form>

                {/* Join Room Form */}
                <form onSubmit={handleJoinRoom} className="drive-results">
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Join Existing Room</h3>
                  <div className="input-group">
                    <label>Room ID</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="e.g. 1"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Password</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Enter room password"
                      value={joinRoomPassword}
                      onChange={(e) => setJoinRoomPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary">
                    <LogIn size={16} /> Join Room
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: My Profile */}
            {activeTab === 'profile' && currentUser && (
              <div className="drive-results" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1rem' }}>User Profile & Google OAuth Status</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div><strong>Database User ID:</strong> #{currentUser.id}</div>
                  <div><strong>Display Name:</strong> {currentUser.name}</div>
                  <div><strong>Verified Gmail:</strong> {currentUser.email}</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Stored Google Access Token:</strong>{' '}
                    <span style={{ fontFamily: 'JetBrains Mono', color: currentUser.google_access_token ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                      {currentUser.google_access_token ? 'Active (Saved in SQLite)' : 'None'}
                    </span>
                  </div>
                  <div>
                    <strong>Stored Google Refresh Token:</strong>{' '}
                    <span style={{ fontFamily: 'JetBrains Mono', color: currentUser.google_refresh_token ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {currentUser.google_refresh_token ? 'Active (Saved in SQLite)' : 'Not Issued'}
                    </span>
                  </div>

                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <div><strong>Drive Space Used:</strong> {formatBytes(currentUser.storage_usage)}</div>
                    <div><strong>Drive Space Capacity:</strong> {currentUser.storage_limit ? formatBytes(currentUser.storage_limit) : 'Unlimited / Unset'}</div>
                  </div>
                </div>

                <div className="token-actions" style={{ marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleDeleteAccount}
                    style={{ color: 'var(--accent-rose)', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' }}
                  >
                    <LogOut size={16} /> Delete Account & Purge Data
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
