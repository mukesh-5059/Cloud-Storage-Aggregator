import React, { useState } from 'react';
import { X, Shield, PlusCircle, LogIn, RefreshCw } from 'lucide-react';

export default function CreateJoinRoomModal({ isOpen, onClose, onCreateRoom, onJoinRoom, error }) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [joinId, setJoinId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreateRoom(name, password);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onJoinRoom(Number(joinId), joinPassword);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Shield size={20} color="var(--emerald-primary)" />
            <span>Room Management</span>
          </h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
            disabled={loading}
          >
            Create New Room
          </button>
          <button
            className={`modal-tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
            disabled={loading}
          >
            Join Existing Room
          </button>
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'var(--red-bg-tint)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--red-status)',
            fontSize: '0.82rem'
          }}>
            {error}
          </div>
        )}

        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Room Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Design Team Shared Vault"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Access Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Set password for room access"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="btn-emerald" disabled={loading} style={{ justifyContent: 'center', marginTop: '8px' }}>
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Creating Room...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={18} />
                  <span>Create Room</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Room ID</label>
              <input
                type="number"
                className="form-input font-mono"
                placeholder="Enter numerical Room ID (e.g. 1)"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Room Access Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter room password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="btn-emerald" disabled={loading} style={{ justifyContent: 'center', marginTop: '8px' }}>
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Joining Room...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Join Room</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
