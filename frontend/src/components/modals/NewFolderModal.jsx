import React, { useState } from 'react';
import { X, FolderPlus, RefreshCw } from 'lucide-react';

export default function NewFolderModal({ isOpen, onClose, onCreateFolder }) {
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setCreating(true);
    try {
      await onCreateFolder(folderName.trim());
      setFolderName('');
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={creating ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <FolderPlus size={20} color="var(--amber-status)" />
            <span>Create New Folder</span>
          </h2>
          <button className="close-btn" onClick={onClose} disabled={creating}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Folder Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Project Assets"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              disabled={creating}
              required
              autoFocus
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-slate" onClick={onClose} disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="btn-emerald" disabled={!folderName.trim() || creating}>
              {creating ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Creating...</span>
                </span>
              ) : (
                'Create Folder'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
