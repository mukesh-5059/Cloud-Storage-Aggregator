import React, { useState, useEffect } from 'react';
import RoomRail from './components/RoomRail';
import RoomHeader from './components/RoomHeader';
import MemberList from './components/MemberList';
import StorageHero from './components/StorageHero';
import FileExplorer from './components/FileExplorer';
import AuthScreen from './components/AuthScreen';
import CreateJoinRoomModal from './components/modals/CreateJoinRoomModal';
import AllocateStorageModal from './components/modals/AllocateStorageModal';

const BACKEND_URL = 'http://localhost:8000';
const CLIENT_ID = '338846147570-nqc50noev8fn4ma36hrpgaltq7jr43k4.apps.googleusercontent.com';

export default function App() {
  const [userNameInput, setUserNameInput] = useState('Mukesh');
  const [appJwt, setAppJwt] = useState(() => localStorage.getItem('app_jwt') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Rooms & Members state
  const [myRooms, setMyRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);

  // Modals state
  const [isCreateJoinModalOpen, setIsCreateJoinModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);

  // Global Keydown listener for Esc modal closing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCreateJoinModalOpen(false);
        setIsAllocateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Fetch profile & rooms when JWT is active
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

  const handleGoogleAuth = (mode) => {
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
                showToast(mode === 'signup' ? 'Account created successfully!' : 'Sign-in successful!');
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
      } else if (res.status === 401) {
        handleLogout();
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
        if (data.length > 0 && !selectedRoom) {
          selectRoom(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectRoom = async (room) => {
    setSelectedRoom(room);
    if (!room) {
      setRoomMembers([]);
      return;
    }
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

  const handleCreateRoomSubmit = async (name, password) => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ name, password })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Created room "${data.name}"!`);
        setIsCreateJoinModalOpen(false);
        fetchMyRooms();
      } else {
        setError(data.detail || 'Failed to create room');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinRoomSubmit = async (roomId, password) => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Joined room!');
        setIsCreateJoinModalOpen(false);
        fetchMyRooms();
      } else {
        setError(data.detail || 'Failed to join room');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopyRoomCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast(`Copied Room ID #${code} to clipboard`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Dedicated Auth Screen if token is absent
  if (!appJwt || !currentUser) {
    return (
      <AuthScreen
        onGoogleAuth={handleGoogleAuth}
        userNameInput={userNameInput}
        setUserNameInput={setUserNameInput}
        error={error}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Toast Banner */}
      {infoMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 2000,
          background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 700,
          boxShadow: 'var(--shadow-elevation)'
        }}>
          {infoMsg}
        </div>
      )}

      {/* Leftmost Discord Server Icon Rail */}
      <RoomRail
        rooms={myRooms}
        activeRoom={selectedRoom}
        onSelectRoom={selectRoom}
        onOpenCreateJoinModal={() => setIsCreateJoinModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Workspace Window */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <RoomHeader
          activeRoom={selectedRoom}
          onCopyRoomCode={handleCopyRoomCode}
          copiedCode={copiedCode}
        />

        {/* Central Workspace + Member List */}
        <div className="workspace-container">
          <div className="central-workspace">
            {/* Prominent Pooled Storage Hero (Top 25-35%) */}
            <StorageHero
              activeRoom={selectedRoom}
              totalUsedBytes={12400000000}
              totalCapacityBytes={50000000000}
              onOpenAllocateModal={() => setIsAllocateModalOpen(true)}
            />

            {/* Central Filesystem Explorer (Below Hero) */}
            <FileExplorer
              activeRoom={selectedRoom}
              currentUser={currentUser}
            />
          </div>

          {/* Right Member Sidebar */}
          <MemberList
            members={roomMembers}
            activeRoom={selectedRoom}
            currentUser={currentUser}
          />
        </div>
      </div>

      {/* Modals */}
      <CreateJoinRoomModal
        isOpen={isCreateJoinModalOpen}
        onClose={() => setIsCreateJoinModalOpen(false)}
        onCreateRoom={handleCreateRoomSubmit}
        onJoinRoom={handleJoinRoomSubmit}
        error={error}
      />

      <AllocateStorageModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        activeRoom={selectedRoom}
        onAllocate={(bytes) => showToast(`Allocated quota updated!`)}
      />
    </div>
  );
}
