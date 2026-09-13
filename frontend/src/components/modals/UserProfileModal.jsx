import React from 'react';
import { X, User, LogOut, HardDrive, Mail, Trash2 } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

export default function UserProfileModal({ isOpen, onClose, user, onLogout, onDeleteAccount }) {
  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <User size={20} color="var(--emerald-primary)" />
            <span>My Profile & Settings</span>
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* User Account Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: '10px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--emerald-bg-tint)',
              border: '1px solid var(--border-emerald)',
              color: 'var(--emerald-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.2rem'
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} title={user.name}>
                {user.name}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                minWidth: 0
              }} title={user.email}>
                <Mail size={12} style={{ flexShrink: 0 }} />
                <span style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'inline-block'
                }}>
                  {user.email}
                </span>
              </div>
              <div className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--emerald-primary)', marginTop: '2px' }}>
                Main User ID: #{user.id}
              </div>
            </div>
          </div>

          {/* Storage Capacity Gauge */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '14px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Google Drive Limit:</span>
              <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                {formatBytes(user.storage_limit || (15 * 1024 * 1024 * 1024))}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Personal GDrive Usage:</span>
              <span className="font-mono" style={{ color: 'var(--amber-status)', fontWeight: 600 }}>
                {formatBytes(user.storage_usage || 0)}
              </span>
            </div>
          </div>

          <div className="modal-footer" style={{ flexDirection: 'column', marginTop: '8px' }}>
            <button className="btn-slate" onClick={onLogout} style={{ justifyContent: 'center', width: '100%' }}>
              <LogOut size={16} />
              <span>Log Out</span>
            </button>

            <button
              className="action-chip destructive"
              onClick={onDeleteAccount}
              style={{ justifyContent: 'center', padding: '10px', borderRadius: '6px', width: '100%' }}
            >
              <Trash2 size={16} />
              <span>Delete My Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
