import React, { useState } from 'react';
import { UploadCloud, HardDriveDownload, Users, Copy, Check } from 'lucide-react';
import { formatBytes } from '../utils/formatters';

export default function StorageHero({ activeRoom, storageData, loading, onOpenUploadModal, onOpenAllocateModal, onToggleMobileMembers }) {
  const [copied, setCopied] = useState(false);

  if (loading && !activeRoom) {
    return (
      <div className="storage-hero">
        <div className="storage-hero-top">
          <div className="storage-room-meta">
            <div>
              <div className="skeleton-box" style={{ width: '180px', height: '24px', marginBottom: '8px' }} />
              <div className="skeleton-box" style={{ width: '120px', height: '18px' }} />
            </div>
          </div>
          <div className="storage-hero-actions">
            <div className="skeleton-box" style={{ width: '100px', height: '36px', borderRadius: '6px' }} />
            <div className="skeleton-box" style={{ width: '120px', height: '36px', borderRadius: '6px' }} />
          </div>
        </div>
        <div className="storage-progress-container">
          <div className="skeleton-box" style={{ width: '100%', height: '10px', borderRadius: '5px' }} />
        </div>
      </div>
    );
  }

  if (!activeRoom) return null;

  const totalAllocated = storageData?.total_allocated_bytes || 0;
  const totalUsed = storageData?.total_used_bytes || 0;
  const availableBytes = Math.max(0, totalAllocated - totalUsed);
  const usagePercentage = totalAllocated > 0 ? Math.min(100, Math.round((totalUsed / totalAllocated) * 100)) : 0;

  const handleCopyRoomId = (e) => {
    e.stopPropagation();
    if (activeRoom?.id !== undefined) {
      navigator.clipboard.writeText(String(activeRoom.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="storage-hero">
      <div className="storage-hero-top">
        <div className="storage-room-meta">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="room-title">{activeRoom.name}</h1>
              <span
                className={`room-id-badge font-mono ${copied ? 'copied' : ''}`}
                onClick={handleCopyRoomId}
                title={copied ? 'Copied to clipboard!' : 'Click to copy Room ID'}
              >
                <span>ID: #{activeRoom.id}</span>
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </span>
            </div>
            <div className="storage-metrics">
              <span className="storage-used-val">{formatBytes(totalUsed)}</span>
              <span className="storage-total-val">/ {formatBytes(totalAllocated)} Pooled</span>
            </div>
          </div>
        </div>

        <div className="storage-hero-actions">
          <button className="btn-emerald" onClick={onOpenUploadModal}>
            <UploadCloud size={18} />
            <span>Upload</span>
          </button>
          <button className="btn-slate" onClick={onOpenAllocateModal}>
            <HardDriveDownload size={18} />
            <span className="btn-text-responsive">Allocate Quota</span>
          </button>
          {onToggleMobileMembers && (
            <button className="btn-slate mobile-members-toggle" onClick={onToggleMobileMembers} title="Toggle Room Members">
              <Users size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="storage-progress-container">
        <div className="storage-progress-track">
          <div className="storage-progress-fill" style={{ width: `${usagePercentage}%` }} />
        </div>
        <div className="storage-progress-subtext">
          <span>{usagePercentage}% Capacity Used</span>
          <span>Available Space: {formatBytes(availableBytes)}</span>
        </div>
      </div>
    </div>
  );
}
