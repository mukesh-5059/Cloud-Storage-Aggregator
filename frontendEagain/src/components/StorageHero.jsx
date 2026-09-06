import React from 'react';
import { UploadCloud, HardDriveDownload } from 'lucide-react';

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function StorageHero({ activeRoom, storageData, onOpenUploadModal, onOpenAllocateModal }) {
  if (!activeRoom) return null;

  const totalAllocated = storageData?.total_allocated_bytes || 0;
  const totalUsed = storageData?.total_used_bytes || 0;
  const availableBytes = Math.max(0, totalAllocated - totalUsed);
  const usagePercentage = totalAllocated > 0 ? Math.min(100, Math.round((totalUsed / totalAllocated) * 100)) : 0;

  return (
    <div className="storage-hero">
      <div className="storage-hero-top">
        <div className="storage-room-meta">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="room-title">{activeRoom.name}</h1>
              <span className="room-id-badge">ID: #{activeRoom.id}</span>
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
            <span>Upload File</span>
          </button>
          <button className="btn-slate" onClick={onOpenAllocateModal}>
            <HardDriveDownload size={18} />
            <span>Allocate Quota</span>
          </button>
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
