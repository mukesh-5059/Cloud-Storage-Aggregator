import React, { useState } from 'react';
import { X, HardDrive, Check, Shield } from 'lucide-react';

export default function AllocateStorageModal({ isOpen, onClose, activeRoom, onAllocate }) {
  const [allocatedGb, setAllocatedGb] = useState(15);

  if (!isOpen || !activeRoom) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onAllocate(allocatedGb * 1024 * 1024 * 1024);
    onClose();
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

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Select how much of your Google Drive capacity you wish to contribute to <strong>{activeRoom.name}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg-rail)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-gdrive-blue)' }}>
              {allocatedGb} GB
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Google Drive Allocated Capacity
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="100"
            value={allocatedGb}
            onChange={(e) => setAllocatedGb(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-gdrive-blue)', cursor: 'pointer' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>1 GB</span>
            <span>50 GB</span>
            <span>100 GB</span>
          </div>

          <button className="btn-new-upload" type="submit" style={{ justifyContent: 'center', marginTop: '10px', backgroundColor: 'var(--accent-gdrive-blue)' }}>
            <Check size={16} />
            <span>Confirm Storage Allocation</span>
          </button>
        </form>
      </div>
    </div>
  );
}
