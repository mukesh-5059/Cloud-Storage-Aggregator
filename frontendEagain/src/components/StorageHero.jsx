import React, { useState } from 'react';
import { HardDrive, Plus, Upload, FolderPlus, Folder, PlusCircle } from 'lucide-react';

export default function StorageHero({
  activeRoom,
  totalUsedBytes = 12400000000,
  totalCapacityBytes = 50000000000,
  onOpenAllocateModal
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const percentage = totalCapacityBytes > 0
    ? Math.min(100, Math.round((totalUsedBytes / totalCapacityBytes) * 100))
    : 0;

  return (
    <section className="storage-hero-dashboard">
      {/* Top Row: Metric & Action Buttons */}
      <div className="storage-hero-top">
        <div className="hero-metric-group">
          <span className="hero-subtitle">
            {activeRoom ? activeRoom.name : 'Pooled Storage Aggregator'}
          </span>
          <div className="hero-metric-big">
            <span>{formatBytes(totalUsedBytes)}</span>
            <span className="hero-metric-limit">/ {formatBytes(totalCapacityBytes)} Pooled</span>
          </div>
        </div>

        <div className="hero-actions">
          {/* + Upload Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn-primary-action"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <Plus size={18} />
              <span>Upload</span>
            </button>

            {isDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                  <Upload size={16} />
                  <span>Upload File</span>
                </div>
                <div className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                  <FolderPlus size={16} />
                  <span>Upload Folder</span>
                </div>
                <div className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                  <Folder size={16} />
                  <span>New Folder</span>
                </div>
              </div>
            )}
          </div>

          {/* Allocate Storage Button */}
          {activeRoom && (
            <button className="btn-secondary-action" onClick={onOpenAllocateModal}>
              <PlusCircle size={16} color="var(--accent-cyan)" />
              <span>Allocate Quota</span>
            </button>
          )}
        </div>
      </div>

      {/* Giant Storage Progress Bar */}
      <div className="hero-progress-section">
        <div className="hero-progress-track">
          <div 
            className="hero-progress-fill" 
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="hero-progress-meta">
          <span>{percentage}% Space Consumed</span>
          <span>Available: {formatBytes(totalCapacityBytes - totalUsedBytes)}</span>
        </div>
      </div>
    </section>
  );
}
