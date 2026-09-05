import React, { useState } from 'react';
import { X, LogOut, Trash2, Move, Folder, ShieldCheck, Lock, Upload, FolderPlus, Info, HardDrive, Calendar, User, FileText, ChevronRight, Home } from 'lucide-react';

export function SignOutModal({ onClose, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Sign Out</h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <p className="modal-subtitle">Are you sure you want to end your active session on RoomVault?</p>

        <div className="modal-actions">
          <button type="button" className="btn-danger-action" onClick={onConfirm}>
            <LogOut size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Confirm Sign Out
          </button>
          <button type="button" className="btn-cancel-modal" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateRoomModal({
  name,
  password,
  setName,
  setPassword,
  onClose,
  onSubmit,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Create Room</h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <p className="modal-subtitle">Create a shared storage room for your team.</p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Room Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Cloud Infra Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Room Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Set a join password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-save-contribution">
              Create Room
            </button>
            <button type="button" className="btn-cancel-modal" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function JoinRoomModal({
  roomId,
  password,
  setRoomId,
  setPassword,
  onClose,
  onSubmit,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Join Room</h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <p className="modal-subtitle">Enter the Room ID and Password shared by the room owner.</p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Room ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. RM-8F9A32"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Room Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter room password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-save-contribution">
              Join Room
            </button>
            <button type="button" className="btn-cancel-modal" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateFolderModal({ onClose, onCreate }) {
  const [folderName, setFolderName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onCreate(folderName.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">New Folder</h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <p className="modal-subtitle">Create a folder in the active directory.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Folder Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Documentation"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-save-contribution">
              <FolderPlus size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Create Folder
            </button>
            <button type="button" className="btn-cancel-modal" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UploadFileModal({ onClose, onUpload }) {
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('1.0 MB');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setFileSize(`${sizeMb} MB`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fileName.trim()) return;
    onUpload(fileName.trim(), fileSize);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Upload File to Current Directory</h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <p className="modal-subtitle">Select a file from your device to upload.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Choose File</label>
            <input
              type="file"
              className="form-input"
              onChange={handleFileChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">File Display Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="filename.ext"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-save-contribution">
              <Upload size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Upload File Now
            </button>
            <button type="button" className="btn-cancel-modal" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FileDetailsModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 className="modal-title" style={{ fontSize: '1.25rem', wordBreak: 'break-all' }}>
            {item.is_folder ? 'Folder Details' : 'File Details'}
          </h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#0f172a',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {item.is_folder ? <Folder size={24} color="#94a3b8" /> : <FileText size={24} color="#3b82f6" />}
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.95rem' }}>
              {item.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {item.is_folder ? 'Directory Folder' : 'Shared File Document'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <User size={16} color="var(--accent-blue)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>UPLOADED BY</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.owner}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <HardDrive size={16} color="var(--accent-green)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>STORED AT</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                {item.stored_at || `Google Drive Pool (${item.owner}'s NodeVaultPool)`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Info size={16} color="var(--accent-yellow)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>FILE SIZE</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.size}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>DATE MODIFIED</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.date_modified}</div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-cancel-modal" onClick={onClose}>
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContributeStorageModal({
  driveConnected,
  freeSpaceGb,
  totalSpaceGb,
  vaultFolder,
  setVaultFolder,
  quotaGb,
  setQuotaGb,
  isExisting,
  onAuthorizeDrive,
  onClose,
  onSubmit,
  loading,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">
            {isExisting ? 'Modify Storage Contribution' : 'Contribute Storage to Pool'}
          </h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        {!driveConnected ? (
          <div>
            <p className="modal-subtitle">
              Grant RoomVault permission to access your Google Drive to pool storage for this room.
            </p>

            <div
              style={{
                padding: '1rem',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                <Lock size={18} /> Scoped Access Security
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                RoomVault only requests access to create and manage its dedicated <code>NodeVaultPool</code> folder. We cannot view or touch your personal Drive files.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-save-contribution"
                onClick={onAuthorizeDrive}
                disabled={loading}
              >
                <ShieldCheck size={18} style={{ display: 'inline', marginRight: '6px' }} />
                {loading ? 'Connecting Google Drive...' : 'Authorize Google Drive Access'}
              </button>
              <button type="button" className="btn-cancel-modal" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <p className="modal-subtitle">
              {isExisting
                ? 'Update your allocated storage quota for this room pool.'
                : 'Select a folder and quota to pool into the room.'}
            </p>

            <div className="form-group">
              <label className="form-label">1. Select Vault Folder in Google Drive</label>
              <div className="folder-pick-row">
                <input
                  type="text"
                  className="form-input"
                  value={vaultFolder}
                  onChange={(e) => setVaultFolder(e.target.value)}
                  required
                />
                <button type="button" className="btn-pick">
                  Pick Folder
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">2. Allocated Storage Quota (GB)</label>
              <input
                type="number"
                className="form-input"
                value={quotaGb}
                onChange={(e) => setQuotaGb(e.target.value)}
                min="1"
                max={Math.floor(freeSpaceGb || 5000)}
                required
              />
            </div>

            <div className="space-estimate-box">
              Free Google Drive Space: <span>{freeSpaceGb !== undefined ? freeSpaceGb : 5081.0} GB</span> / {totalSpaceGb !== undefined ? totalSpaceGb : 5120.0} GB
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn-save-contribution">
                {isExisting ? 'Update Storage Contribution' : 'Save Storage Contribution'}
              </button>
              <button type="button" className="btn-cancel-modal" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function MoveFileModal({ selectedItem, folders, onClose, onMove }) {
  const [selectedFolderId, setSelectedFolderId] = useState('root');
  // Expand all folders by default so user sees full directory tree
  const [expandedFolderIds, setExpandedFolderIds] = useState(() => {
    const ids = new Set(['root']);
    (folders || []).forEach((f) => ids.add(f.id));
    return ids;
  });

  const toggleExpand = (folderId, e) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const selectedFolderName =
    selectedFolderId === 'root'
      ? 'Root Directory'
      : folders.find((f) => f.id === selectedFolderId)?.name || 'Selected Folder';

  const renderFolderTree = (parentId = null, level = 0) => {
    const children = folders.filter((f) => {
      if (parentId === null) {
        return !f.parent_id || f.parent_id === 'root' || f.parent_id === 'null';
      }
      return f.parent_id === parentId;
    });

    if (children.length === 0) return null;

    return (
      <div className="folder-tree-branch" style={{ paddingLeft: level > 0 ? '1.25rem' : '0' }}>
        {children.map((folder) => {
          const isExpanded = expandedFolderIds.has(folder.id);
          const isSelected = selectedFolderId === folder.id;
          const subChildren = folders.filter((f) => f.parent_id === folder.id);
          const hasChildren = subChildren.length > 0;

          return (
            <div key={folder.id} className="folder-tree-item-box">
              <div
                className={`folder-tree-row ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                {hasChildren ? (
                  <span className="expand-arrow" onClick={(e) => toggleExpand(folder.id, e)}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                ) : (
                  <span className="expand-spacer" />
                )}
                <Folder size={16} color={isSelected ? '#3b82f6' : '#94a3b8'} />
                <span className="folder-name">{folder.name}</span>
              </div>

              {isExpanded && hasChildren && renderFolderTree(folder.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '460px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Move Item</h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <p className="modal-subtitle">
          Select destination folder for <strong>{selectedItem?.name}</strong>
        </p>

        {/* GOOGLE DRIVE STYLE MINI FILE EXPLORER TREE (ALL FOLDERS IN ROOM) */}
        <div className="mini-explorer-container">
          <div className="folder-tree-branch">
            <div
              className={`folder-tree-row ${selectedFolderId === 'root' ? 'selected' : ''}`}
              onClick={() => setSelectedFolderId('root')}
            >
              <Home size={16} color={selectedFolderId === 'root' ? '#3b82f6' : '#94a3b8'} />
              <span className="folder-name" style={{ fontWeight: 600 }}>Root Directory (/)</span>
            </div>

            {renderFolderTree(null, 1)}
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Target Location: <strong style={{ color: 'var(--accent-blue)' }}>{selectedFolderName}</strong>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-save-contribution"
            onClick={() => onMove(selectedItem?.id, selectedFolderId === 'root' ? null : selectedFolderId)}
          >
            <Move size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Move Here
          </button>
          <button type="button" className="btn-cancel-modal" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeleteFileModal({ selectedItem, onClose, onDelete }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Delete {selectedItem?.is_folder ? 'Folder' : 'File'}</h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <p className="modal-subtitle">
          Are you sure you want to delete <strong>{selectedItem?.name}</strong>? This action cannot be undone.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-danger-action"
            onClick={() => onDelete(selectedItem?.id)}
          >
            <Trash2 size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Delete Permanently
          </button>
          <button type="button" className="btn-cancel-modal" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
