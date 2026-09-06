import React from 'react';
import { X, User, Mail, HardDrive, LogOut, Trash2, ShieldCheck } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, currentUser, onLogout, onDeleteAccount }) {
  if (!isOpen || !currentUser) return null;

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalLimit = currentUser.storage_limit || (15 * 1024 * 1024 * 1024);
  const totalUsage = currentUser.storage_usage || 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-header)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={22} color="var(--accent-cyan)" />
            <span>Account Profile</span>
          </h2>
          <X size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        {/* User Profile Card */}
        <div style={{ background: 'var(--bg-rail)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700
            }}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-header)' }}>{currentUser.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                <Mail size={14} color="var(--accent-cyan)" />
                <span>{currentUser.email}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--accent-emerald)', marginBottom: '16px' }}>
            <ShieldCheck size={16} />
            <span>Google Identity Verified</span>
          </div>

          {/* Storage Quota Breakdown */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              GOOGLE DRIVE STORAGE QUOTA
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-normal)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HardDrive size={16} color="var(--accent-cyan)" />
                <span>Used: {formatBytes(totalUsage)}</span>
              </div>
              <span>Total: {formatBytes(totalLimit)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Sign Out & Delete Account */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            className="btn-secondary-action" 
            style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.9rem' }}
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>

          <button 
            className="btn-secondary-action" 
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '10px',
              fontSize: '0.9rem',
              color: 'var(--accent-rose)',
              borderColor: 'rgba(244, 63, 94, 0.3)',
              backgroundColor: 'rgba(244, 63, 94, 0.08)'
            }}
            onClick={() => {
              if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
                onClose();
                onDeleteAccount();
              }
            }}
          >
            <Trash2 size={16} />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
