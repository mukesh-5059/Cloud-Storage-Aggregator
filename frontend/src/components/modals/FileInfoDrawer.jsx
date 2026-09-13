import React from 'react';
import { X, Info, FileText, Folder, HardDrive, User, Calendar } from 'lucide-react';
import { formatBytes, formatFileName } from '../../utils/formatters';

export default function FileInfoDrawer({ isOpen, onClose, file }) {
  if (!isOpen || !file) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Info size={20} color="var(--emerald-primary)" />
            <span>File Details</span>
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px'
          }}>
            {file.is_folder ? (
              <Folder size={32} color="var(--amber-status)" />
            ) : (
              <FileText size={32} color="var(--emerald-primary)" />
            )}
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={formatFileName(file.name)}>
                {formatFileName(file.name)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="font-mono">
                {file.is_folder ? 'Directory Folder' : (file.mime_type || 'Unknown Type')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HardDrive size={16} /> Size:</span>
              <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatBytes(file.size_bytes)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}><User size={16} /> Hosted On:</span>
              <span style={{ color: 'var(--emerald-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={file.host_name || ''}>
                {file.is_folder ? '—' : (file.host_name || `User #${file.storage_user_id}`)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}><User size={16} /> Uploaded By:</span>
              <span style={{ color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={file.uploader_name || ''}>
                {file.uploader_name || `User #${file.uploader_id}`}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> Created Date:</span>
              <span className="font-mono" style={{ color: 'var(--text-main)' }}>{new Date(file.created_at).toLocaleString()}</span>
            </div>

            {file.gdrive_file_id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} className="font-mono">Google Drive File ID:</span>
                <span className="font-mono" style={{ fontSize: '0.75rem', padding: '6px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px', wordBreak: 'break-all', color: 'var(--emerald-primary)' }}>
                  {file.gdrive_file_id}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
