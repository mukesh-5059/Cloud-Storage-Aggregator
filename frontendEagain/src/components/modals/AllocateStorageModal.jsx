import React, { useState } from 'react';
import { X, HardDrive, CheckCircle } from 'lucide-react';

export default function AllocateStorageModal({ isOpen, onClose, activeRoom, currentUser, onAllocateStorage }) {
  const [allocatedGb, setAllocatedGb] = useState(5);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !activeRoom) return null;

  // Google Drive standard 15GB free limit fallback
  const userTotalLimitBytes = currentUser?.storage_limit || (15 * 1024 * 1024 * 1024);
  const userUsageBytes = currentUser?.storage_usage || 0;
  const availableFreeBytes = Math.max(1 * 1024 * 1024 * 1024, userTotalLimitBytes - userUsageBytes);
  const maxAvailableGb = Math.max(1, Math.floor(availableFreeBytes / (1024 * 1024 * 1024)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const bytes = allocatedGb * 1024 * 1024 * 1024;
    try {
      await onAllocateStorage(bytes);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <HardDrive size={20} color="var(--emerald-primary)" />
            <span>Allocate Storage Quota</span>
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Contribute a portion of your personal Google Drive capacity to <strong style={{ color: 'var(--text-main)' }}>{activeRoom.name}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <input
                type="number"
                min="1"
                max={maxAvailableGb}
                value={allocatedGb}
                onChange={(e) => setAllocatedGb(Math.min(maxAvailableGb, Math.max(1, Number(e.target.value))))}
                className="font-mono"
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: 'var(--emerald-primary)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '6px',
                  textAlign: 'center',
                  width: '110px',
                  padding: '4px'
                }}
              />
              <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--emerald-primary)' }}>GB</span>
            </div>
            <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Max Available Free Space: {maxAvailableGb} GB
            </div>
          </div>

          <input
            type="range"
            min="1"
            max={maxAvailableGb}
            value={allocatedGb}
            onChange={(e) => setAllocatedGb(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--emerald-primary)', cursor: 'pointer' }}
          />

          <button
            type="submit"
            className="btn-emerald"
            disabled={loading}
            style={{ justifyContent: 'center', marginTop: '8px' }}
          >
            <CheckCircle size={18} />
            <span>{loading ? 'Allocating...' : `Confirm ${allocatedGb} GB Allocation`}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
