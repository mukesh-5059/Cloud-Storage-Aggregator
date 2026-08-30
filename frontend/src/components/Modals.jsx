import React from 'react';
import { X, LogOut } from 'lucide-react';

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
  vaultFolder,
  setVaultFolder,
  quotaGb,
  setQuotaGb,
  onClose,
  onSubmit,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2 className="modal-title">Contribute Storage to Pool</h2>
        <p className="modal-subtitle">Allocate a folder on your device to store shared room files.</p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">1. Select Allocated Vault Folder</label>
            <div className="folder-pick-row">
              <input
                type="text"
                className="form-input"
                value={vaultFolder}
                onChange={(e) => setVaultFolder(e.target.value)}
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
              max="100"
              required
            />
          </div>

          <div className="space-estimate-box">
            Estimated Free Disk Space: <span>{quotaGb} GB</span> / {quotaGb} GB
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
      </div>
    </div>
  );
}
