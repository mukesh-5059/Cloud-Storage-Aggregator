import React, { useState } from 'react';
import { X, LogOut, Trash2, Move, Download, Folder, ShieldCheck, HardDrive, Lock } from 'lucide-react';

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

export function ContributeStorageModal({
  driveConnected,
  freeSpaceGb,
  totalSpaceGb,
  vaultFolder,
  setVaultFolder,
  quotaGb,
  setQuotaGb,
  onAuthorizeDrive,
  onClose,
  onSubmit,
  loading,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Contribute Storage to Pool</h2>
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
              Google Drive Connected! Select a folder and quota to pool into the room.
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
                max={Math.floor(freeSpaceGb || 15)}
                required
              />
            </div>

            <div className="space-estimate-box">
              Free Google Drive Space: <span>{freeSpaceGb || 12.5} GB</span> / {totalSpaceGb || 15.0} GB
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn-save-contribution">
                Save Storage Contribution
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
  const [targetFolder, setTargetFolder] = useState('root');

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Move Item</h2>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <p className="modal-subtitle">
          Select destination folder for <strong>{selectedItem?.name}</strong>
        </p>

        <div className="form-group">
          <label className="form-label">Destination Folder</label>
          <select
            className="form-input"
            value={targetFolder}
            onChange={(e) => setTargetFolder(e.target.value)}
          >
            <option value="root">📁 Root Directory</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                📁 {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-save-contribution"
            onClick={() => onMove(selectedItem?.id, targetFolder)}
          >
            <Move size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Move Item Here
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
