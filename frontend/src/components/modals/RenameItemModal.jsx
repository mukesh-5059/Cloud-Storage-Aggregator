import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2, AlertCircle } from 'lucide-react';
import { formatFileName } from '../../utils/formatters';

export default function RenameItemModal({
  isOpen,
  onClose,
  fileItem,
  appJwt,
  onRenameSuccess,
  BACKEND_URL
}) {
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && fileItem) {
      const cleanName = formatFileName(fileItem.name || '');
      setNewName(cleanName);
      setErrorMessage(null);
      setRenaming(false);

      // Highlight filename stem on focus
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const dotIdx = cleanName.lastIndexOf('.');
          if (dotIdx > 0 && !fileItem.is_folder) {
            inputRef.current.setSelectionRange(0, dotIdx);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, fileItem]);

  if (!isOpen || !fileItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setErrorMessage('Name cannot be empty');
      return;
    }
    if (trimmed === fileItem.name || trimmed === formatFileName(fileItem.name)) {
      onClose();
      return;
    }

    setRenaming(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${BACKEND_URL}/files/${fileItem.id}/rename`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ new_name: trimmed })
      });

      if (res.ok) {
        const updatedItem = await res.json();
        onRenameSuccess(updatedItem);
        onClose();
      } else {
        const err = await res.json();
        setErrorMessage(err.detail || 'Failed to rename item');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Server connection failed');
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={renaming ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Edit2 size={20} color="var(--emerald-primary)" />
            <span>Rename {fileItem.is_folder ? 'Folder' : 'File'}</span>
          </h2>
          <button className="close-btn" onClick={onClose} disabled={renaming}>
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'var(--red-bg-tint)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--red-status)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Item Name</label>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={renaming}
              placeholder="Enter new name"
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-slate" onClick={onClose} disabled={renaming}>
              Cancel
            </button>
            <button type="submit" className="btn-emerald" disabled={!newName.trim() || renaming}>
              {renaming ? 'Saving...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
