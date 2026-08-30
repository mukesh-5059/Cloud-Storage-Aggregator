import React, { useState, useEffect, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

import LoginScreen from './components/LoginScreen';
import ServerRail from './components/ServerRail';
import MainWorkspace from './components/MainWorkspace';
import RightMembersPanel from './components/RightMembersPanel';
import DiscordProfilePopout from './components/DiscordProfilePopout';
import {
  SignOutModal,
  CreateRoomModal,
  JoinRoomModal,
  ContributeStorageModal
} from './components/Modals';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('roomvault_token') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Rooms & Workspace state
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeRoomDetails, setActiveRoomDetails] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Hovered member state for expanded Discord profile popover card
  const [activeProfileCard, setActiveProfileCard] = useState(null);
  const [profileCardTop, setProfileCardTop] = useState(100);
  const popoutTimeoutRef = useRef(null);

  // Form states
  const [createRoomName, setCreateRoomName] = useState('');
  const [createRoomPassword, setCreateRoomPassword] = useState('');

  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomPassword, setJoinRoomPassword] = useState('');

  const [vaultFolder, setVaultFolder] = useState('NodeVaultPool');
  const [quotaGb, setQuotaGb] = useState('10');

  // Check existing session
  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    }
  }, [token]);

  // Fetch rooms whenever user is authenticated
  useEffect(() => {
    if (token && user) {
      fetchMyRooms();
    }
  }, [token, user]);

  // Fetch details for active room
  useEffect(() => {
    if (activeRoomId && token) {
      fetchRoomDetails(activeRoomId);
    }
  }, [activeRoomId]);

  const fetchCurrentUser = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        performLogout();
      }
    } catch (err) {
      console.error('Session check failed:', err);
    }
  };

  const fetchMyRooms = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/rooms/my-rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
        if (data.rooms.length > 0 && !activeRoomId) {
          setActiveRoomId(data.rooms[0].room_id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const fetchRoomDetails = async (roomId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRoomDetails(data.room);
      }
    } catch (err) {
      console.error('Failed to fetch room details:', err);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    setError('');

    try {
      const payload = tokenResponse.access_token
        ? { access_token: tokenResponse.access_token }
        : { code: tokenResponse.code };

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      localStorage.setItem('roomvault_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (err) => {
      console.error('Google Auth Error:', err);
      setError('Google Sign-In popup failed.');
    },
  });

  const performLogout = () => {
    localStorage.removeItem('roomvault_token');
    setToken('');
    setUser(null);
    setRooms([]);
    setActiveRoomId(null);
    setActiveRoomDetails(null);
    setShowSignOutModal(false);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!createRoomName || !createRoomPassword) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: createRoomName, password: createRoomPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create room');

      setShowCreateModal(false);
      setCreateRoomName('');
      setCreateRoomPassword('');
      await fetchMyRooms();
      setActiveRoomId(data.room.room_id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinRoomId || !joinRoomPassword) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ room_id: joinRoomId, password: joinRoomPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to join room');

      setShowJoinModal(false);
      setJoinRoomId('');
      setJoinRoomPassword('');
      await fetchMyRooms();
      setActiveRoomId(data.room.room_id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveContribution = async (e) => {
    e.preventDefault();
    if (!activeRoomId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/rooms/contribute-storage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: activeRoomId,
          quota_gb: parseFloat(quotaGb) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to contribute storage');
      }

      setShowContributeModal(false);
      fetchRoomDetails(activeRoomId);
      fetchMyRooms();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyRoomId = () => {
    if (!activeRoomDetails) return;
    navigator.clipboard.writeText(activeRoomDetails.room_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleMemberMouseEnter = (e, member) => {
    if (popoutTimeoutRef.current) {
      clearTimeout(popoutTimeoutRef.current);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const calculatedTop = Math.max(16, Math.min(rect.top - 10, window.innerHeight - 320));
    setProfileCardTop(calculatedTop);
    setActiveProfileCard(member);
  };

  const handleMemberMouseLeave = () => {
    popoutTimeoutRef.current = setTimeout(() => {
      setActiveProfileCard(null);
    }, 200);
  };

  const handlePopoutMouseEnter = () => {
    if (popoutTimeoutRef.current) {
      clearTimeout(popoutTimeoutRef.current);
    }
  };

  const handlePopoutMouseLeave = () => {
    popoutTimeoutRef.current = setTimeout(() => {
      setActiveProfileCard(null);
    }, 200);
  };

  // If user is not logged in, render Google Login screen
  if (!user) {
    return <LoginScreen onLogin={loginWithGoogle} loading={loading} error={error} />;
  }

  return (
    <div className="discord-layout">
      {/* Leftmost Server/Room Icon Rail */}
      <ServerRail
        user={user}
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={(id) => setActiveRoomId(id)}
        onOpenCreateModal={() => setShowCreateModal(true)}
        onOpenJoinModal={() => setShowJoinModal(true)}
        onOpenSignOutModal={() => setShowSignOutModal(true)}
      />

      {/* Center Main Workspace */}
      <MainWorkspace
        activeRoomDetails={activeRoomDetails}
        copiedId={copiedId}
        onCopyRoomId={copyRoomId}
      />

      {/* Rightmost Sidebar: Storage Pool + Members List */}
      <RightMembersPanel
        activeRoomDetails={activeRoomDetails}
        onOpenContributeModal={() => setShowContributeModal(true)}
        onMemberMouseEnter={handleMemberMouseEnter}
        onMemberMouseLeave={handleMemberMouseLeave}
      />

      {/* Discord Profile Hover Card (Persists on Hover over Card) */}
      <DiscordProfilePopout
        member={activeProfileCard}
        top={profileCardTop}
        onMouseEnter={handlePopoutMouseEnter}
        onMouseLeave={handlePopoutMouseLeave}
      />

      {/* Dialog Modals */}
      {showSignOutModal && (
        <SignOutModal
          onClose={() => setShowSignOutModal(false)}
          onConfirm={performLogout}
        />
      )}

      {showCreateModal && (
        <CreateRoomModal
          name={createRoomName}
          password={createRoomPassword}
          setName={setCreateRoomName}
          setPassword={setCreateRoomPassword}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRoom}
        />
      )}

      {showJoinModal && (
        <JoinRoomModal
          roomId={joinRoomId}
          password={joinRoomPassword}
          setRoomId={setJoinRoomId}
          setPassword={setJoinRoomPassword}
          onClose={() => setShowJoinModal(false)}
          onSubmit={handleJoinRoom}
        />
      )}

      {showContributeModal && (
        <ContributeStorageModal
          vaultFolder={vaultFolder}
          setVaultFolder={setVaultFolder}
          quotaGb={quotaGb}
          setQuotaGb={setQuotaGb}
          onClose={() => setShowContributeModal(false)}
          onSubmit={handleSaveContribution}
        />
      )}
    </div>
  );
}
