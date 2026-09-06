import React, { useState } from 'react';
import { X, HardDrive, Check } from 'lucide-react';

const BACKEND_URL = 'http://localhost:8000';

export default function AllocateStorageModal({ isOpen, onClose, activeRoom, appJwt, currentUser, onAllocateSuccess }) {
  const [allocatedGb, setAllocatedGb] = useState(5);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !activeRoom) return null;

  // Dynamic limits from user profile (default to 15GB standard free Google Drive quota if limit not provided)
  const userTotalLimitBytes = currentUser?.storage_limit || (15 * 1024 * 1024 * 1024);
  const userUsageBytes = currentUser?.storage_usage || 0;
  const availableFreeBytes = Math.max(1 * 1024 * 1024 * 1024, userTotalLimitBytes - userUsageBytes);
  const maxAvailableGb = Math.max(1, Math.floor(availableFreeBytes / (1024 * 1024 * 1024)));

  const handleTextChange = (e) => {
    const val = Number(e.target.value);
    if (isNaN(val)) return;
    setAllocatedGb(Math.min(maxAvailableGb, Math.max(0, val)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const bytes = allocatedGb * 1024 * 1024 * 1024;
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${activeRoom.id}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ allocated_bytes: bytes })
      });
      if (res.ok) {
        onAllocateSuccess(bytes);
        onClose();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to allocate storage');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-header)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={20} color="var(--accent-gdrive-blue)" />
            <span>Allocate Storage Quota</span>
          </h2>
          <X size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Select how much of your Google Drive capacity you wish to contribute to <strong>{activeRoom.name}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg-rail)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <input
                type="number"
                min="0"
                max={maxAvailableGb}
                value={allocatedGb}
                onChange={handleTextChange}
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: 'var(--accent-gdrive-blue)',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  textAlign: 'center',
                  width: '100px',
                  padding: '4px'
                }}
              />
              <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-gdrive-blue)' }}>GB</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Max Available Free Space: {maxAvailableGb} GB
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={maxAvailableGb}
            value={allocatedGb}
            onChange={(e) => setAllocatedGb(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-gdrive-blue)', cursor: 'pointer' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>0 GB</span>
            <span>{Math.floor(maxAvailableGb / 2)} GB</span>
            <span>{maxAvailableGb} GB</span>
          </div>

          <button 
            className="btn-new-upload" 
            type="submit" 
            disabled={loading}
            style={{ justifyContent: 'center', marginTop: '10px', backgroundColor: 'var(--accent-gdrive-blue)' }}
          >
            <Check size={16} />
            <span>{loading ? 'Allocating...' : 'Confirm Storage Allocation'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}


