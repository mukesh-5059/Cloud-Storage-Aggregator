import React, { useState, useEffect, useRef } from 'react';
import { HardDrive, Plus, Upload, FolderPlus, Folder, PlusCircle } from 'lucide-react';

const BACKEND_URL = 'http://localhost:8000';

export default function StorageHero({
  activeRoom,
  appJwt,
  onOpenAllocateModal,
  refreshTrigger
}) {
  const [storageData, setStorageData] = useState({ total_allocated_bytes: 0, total_used_bytes: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeRoom && appJwt) {
      fetchStorageSummary();
    } else {
      setStorageData({ total_allocated_bytes: 0, total_used_bytes: 0 });
    }
  }, [activeRoom, appJwt, refreshTrigger]);

  const fetchStorageSummary = async () => {
    if (!activeRoom || !appJwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${activeRoom.id}/storage`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStorageData(data);
      }
    } catch (err) {
      console.error("Failed to fetch storage summary:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeRoom || !appJwt) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BACKEND_URL}/files/room/${activeRoom.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${appJwt}` },
        body: formData
      });
      if (res.ok) {
        fetchStorageSummary();
        window.location.reload(); // Simple refresh to show new file
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Upload failed');
      }
    } catch (err) {
      console.error("File upload error:", err);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalUsedBytes = storageData.total_used_bytes || 0;
  const totalCapacityBytes = storageData.total_allocated_bytes || 0;

  const percentage = totalCapacityBytes > 0
    ? Math.min(100, Math.round((totalUsedBytes / totalCapacityBytes) * 100))
    : 0;

  return (
    <section className="storage-hero-dashboard">
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileUpload} 
      />
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
          {activeRoom && (
            <button 
              className="btn-primary-action"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus size={18} />
              <span>Upload File</span>
            </button>
          )}

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
          <span>Available: {formatBytes(Math.max(0, totalCapacityBytes - totalUsedBytes))}</span>
        </div>
      </div>
    </section>
  );
}

