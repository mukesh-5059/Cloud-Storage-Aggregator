import React from 'react';
import { X, AlertTriangle, Trash2, FileText, Folder } from 'lucide-react';
import { formatBytes, formatFileName } from '../../utils/formatters';

export default function ConfirmDeleteModal({ isOpen, onClose, item, onConfirmDelete }) {
  if (!isOpen || !item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--red-status)' }}>
            <AlertTriangle size={20} color="var(--red-status)" />
            <span>Confirm Deletion</span>
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '12px 0' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px'
          }}>
            {item.is_folder ? (
              <Folder size={32} color="var(--amber-status)" />
            ) : (
              <FileText size={32} color="var(--emerald-primary)" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {formatFileName(item.name)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="font-mono">
                {item.is_folder ? 'Directory Folder' : formatBytes(item.size_bytes)}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Are you sure you want to permanently delete this {item.is_folder ? 'folder' : 'file'}? This action cannot be undone.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn-slate" onClick={onClose}>
            Cancel
          </button>
          <button
            className="action-chip destructive"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: 'var(--red-bg-tint)',
              borderColor: 'var(--red-status)',
              color: 'var(--red-status)'
            }}
            onClick={() => {
              onConfirmDelete(item);
              onClose();
            }}
          >
            <Trash2 size={16} />
            <span>Delete {item.is_folder ? 'Folder' : 'File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
