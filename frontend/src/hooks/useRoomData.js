import { useState, useCallback, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';

export function useRoomData(appJwt, showToast, handleLogout, setError, setIsCreateJoinModalOpen) {
  const [myRooms, setMyRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [storageData, setStorageData] = useState({ total_allocated_bytes: 0, total_used_bytes: 0 });
  const [roomMembers, setRoomMembers] = useState([]);

  // Fetch Joined Rooms
  const fetchMyRooms = useCallback(async () => {
    if (!appJwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const rooms = await res.json();
        setMyRooms(rooms);
        if (rooms.length > 0) {
          if (!activeRoomId || !rooms.some(r => r.id === activeRoomId)) {
            setActiveRoomId(rooms[0].id);
          }
        } else {
          setActiveRoomId(null);
          setActiveRoom(null);
          setStorageData({ total_allocated_bytes: 0, total_used_bytes: 0 });
          setRoomMembers([]);
        }
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  }, [appJwt, activeRoomId, handleLogout]);

  // Fetch Consolidated Room Dashboard
  const fetchRoomDashboard = useCallback(async (roomId) => {
    if (!appJwt || !roomId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${roomId}/dashboard`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRoom(data.room);
        setStorageData(data.storage);
        setRoomMembers(data.members);
        return data;
      }
    } catch (err) {
      console.error('Failed to load room dashboard:', err);
    }
    return null;
  }, [appJwt]);

  // Initial rooms fetch trigger
  useEffect(() => {
    if (appJwt) {
      fetchMyRooms();
    }
  }, [appJwt, fetchMyRooms]);

  // Load Dashboard on Room Switch
  useEffect(() => {
    if (activeRoomId) {
      fetchRoomDashboard(activeRoomId);
    }
  }, [activeRoomId, fetchRoomDashboard]);

  // Create Room Handler
  const handleCreateRoom = async (name, password) => {
    try {
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ name, password })
      });
      if (res.ok) {
        const newRoom = await res.json();
        setMyRooms(prev => [...prev, newRoom]);
        setActiveRoomId(newRoom.id);
        if (setIsCreateJoinModalOpen) setIsCreateJoinModalOpen(false);
        if (showToast) showToast(`Created room "${newRoom.name}"`);
      } else {
        const err = await res.json();
        if (setError) setError(err.detail || 'Failed to create room');
      }
    } catch (err) {
      console.error('Error creating room:', err);
    }
  };

  // Join Room Handler
  const handleJoinRoom = async (roomId, password) => {
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        await fetchMyRooms();
        setActiveRoomId(roomId);
        if (setIsCreateJoinModalOpen) setIsCreateJoinModalOpen(false);
        if (showToast) showToast('Successfully joined room');
      } else {
        const err = await res.json();
        if (setError) setError(err.detail || 'Invalid room ID or password');
      }
    } catch (err) {
      console.error('Error joining room:', err);
    }
  };

  // Storage Quota Allocation Handler
  const handleAllocateStorage = async (allocatedBytes) => {
    if (!activeRoomId) return;
    const res = await fetch(`${BACKEND_URL}/rooms/${activeRoomId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appJwt}`
      },
      body: JSON.stringify({ allocated_bytes: allocatedBytes })
    });
    if (res.ok) {
      fetchRoomDashboard(activeRoomId);
      if (showToast) showToast('Storage quota updated');
    }
  };

  return {
    myRooms,
    activeRoomId,
    setActiveRoomId,
    activeRoom,
    storageData,
    roomMembers,
    fetchMyRooms,
    fetchRoomDashboard,
    handleCreateRoom,
    handleJoinRoom,
    handleAllocateStorage
  };
}
