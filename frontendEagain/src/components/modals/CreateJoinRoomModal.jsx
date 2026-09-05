import React, { useState } from 'react';
import { X, PlusCircle, LogIn, Lock, Shield } from 'lucide-react';

export default function CreateJoinRoomModal({ isOpen, onClose, onCreateRoom, onJoinRoom, error }) {
  const [tab, setTab] = useState('create'); // 'create' or 'join'
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [joinId, setJoinId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  if (!isOpen) return null;

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    onCreateRoom(name, password);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    onJoinRoom(joinId, joinPassword);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-header)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--accent-blurple)" />
            <span>Room Operations</span>
          </h2>
          <X size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-rail)', padding: '4px', borderRadius: '8px', marginBottom: '20px' }}>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '0.85rem',
              backgroundColor: tab === 'create' ? 'var(--accent-blurple)' : 'transparent',
              color: '#ffffff'
            }}
            onClick={() => setTab('create')}
          >
            Create Room
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '0.85rem',
              backgroundColor: tab === 'join' ? 'var(--accent-blurple)' : 'transparent',
              color: '#ffffff'
            }}
            onClick={() => setTab('join')}
          >
            Join Room
          </button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(242, 63, 67, 0.15)', color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {tab === 'create' ? (
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Room Name</label>
              <input
                type="text"
                placeholder="e.g. Design Team Storage"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-rail)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-normal)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Access Password</label>
              <input
                type="password"
                placeholder="Set room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-rail)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-normal)' }}
              />
            </div>
            <button className="btn-new-upload" type="submit" style={{ justifyContent: 'center', marginTop: '10px' }}>
              <PlusCircle size={16} />
              <span>Create New Room</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Room ID / Code</label>
              <input
                type="text"
                placeholder="e.g. 102"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-rail)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-normal)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Room Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-rail)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-normal)' }}
              />
            </div>
            <button className="btn-new-upload" type="submit" style={{ justifyContent: 'center', marginTop: '10px', backgroundColor: 'var(--accent-green)' }}>
              <LogIn size={16} />
              <span>Join Room</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
