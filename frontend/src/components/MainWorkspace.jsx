import React from 'react';
import {
  Search,
  FolderPlus,
  Upload,
  Folder,
  FileText,
  MoreVertical,
  ArrowUp,
  Copy,
  Check,
  Shield,
  HardDrive
} from 'lucide-react';

export default function MainWorkspace({ activeRoomDetails, copiedId, onCopyRoomId }) {
  return (
    <div className="main-workspace">
      {/* Topbar */}
      <div className="workspace-topbar">
        <div className="topbar-room-info">
          {activeRoomDetails ? (
            <>
              <div className="topbar-room-title">{activeRoomDetails.name}</div>
              <div className="room-id-badge" onClick={onCopyRoomId} title="Click to copy Room ID">
                {copiedId ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                {activeRoomDetails.room_id}
              </div>
              <Shield size={16} color="var(--accent-green)" />
            </>
          ) : (
            <div className="topbar-room-title" style={{ color: 'var(--text-muted)' }}>
              Select a Room
            </div>
          )}
        </div>

        <div className="search-input-box">
          <Search size={16} />
          <input type="text" placeholder="Search files in room..." />
        </div>

        <div className="topbar-actions">
          <button className="btn-secondary">
            <FolderPlus size={16} /> New Folder
          </button>
          <button className="btn-primary-action">
            <Upload size={16} /> Upload File
          </button>
        </div>
      </div>

      {/* File Table View */}
      <div className="file-table-container">
        {activeRoomDetails ? (
          <table className="file-table">
            <thead>
              <tr>
                <th>
                  Name <ArrowUp size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </th>
                <th>Owner</th>
                <th>Date modified</th>
                <th>File size</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {activeRoomDetails.files?.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="file-name-cell">
                      {item.is_folder ? (
                        <Folder size={20} color="#94a3b8" />
                      ) : (
                        <FileText size={20} color="#3b82f6" />
                      )}
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="owner-pill">
                      <div className="owner-initials">{item.owner_initials}</div>
                      <span>{item.owner}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{item.date_modified}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{item.size}</td>
                  <td>
                    <MoreVertical size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'var(--text-muted)',
            }}
          >
            <HardDrive size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <h3>Select a Room to view shared storage</h3>
          </div>
        )}
      </div>
    </div>
  );
}
