import React, { useState } from 'react';
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
  HardDrive,
  Download,
  Move,
  Trash2,
  ChevronRight,
  Home
} from 'lucide-react';

export default function MainWorkspace({
  activeRoomDetails,
  copiedId,
  onCopyRoomId,
  onOpenMoveModal,
  onOpenDeleteModal,
}) {
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null); // null = root
  const [folderPath, setFolderPath] = useState([]);

  const selectedItem = activeRoomDetails?.files?.find((f) => f.id === selectedItemId);

  const handleRowClick = (item) => {
    if (selectedItemId === item.id) {
      setSelectedItemId(null); // toggle unselect
    } else {
      setSelectedItemId(item.id);
    }
  };

  const handleRowDoubleClick = (item) => {
    if (item.is_folder) {
      setCurrentFolder(item.id);
      setFolderPath((prev) => [...prev, { id: item.id, name: item.name }]);
      setSelectedItemId(null);
    } else {
      // Simulate file download/preview
      alert(`Opening/Downloading file: ${item.name}`);
    }
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolder(newPath[newPath.length - 1].id);
    }
    setSelectedItemId(null);
  };

  const handleDownload = (item) => {
    alert(`Downloading ${item.name}...`);
  };

  // Calculate storage usage values
  const totalAllocated = activeRoomDetails?.total_allocated_gb || 20;
  const usedStorage = activeRoomDetails?.used_storage_gb || 4.2;
  const usagePercentage = Math.min(100, (usedStorage / (totalAllocated || 1)) * 100).toFixed(1);

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

      {/* BIG STORAGE USAGE BANNER BELOW TOPBAR */}
      {activeRoomDetails && (
        <div className="storage-banner-container">
          <div className="storage-banner-text-row">
            <span className="storage-big-number">{usedStorage} GB</span>
            <span className="storage-used-label">used of</span>
            <span className="storage-total-number">{totalAllocated} GB</span>
            <span className="storage-subtext">{usagePercentage}% of pool quota filled</span>
          </div>

          <div className="storage-banner-progress-bg">
            <div
              className="storage-banner-progress-fill"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* File Table View */}
      <div className="file-table-container">
        {/* Breadcrumb Navigation */}
        {activeRoomDetails && (
          <div className="breadcrumb-bar">
            <span className="breadcrumb-item" onClick={() => handleBreadcrumbClick(-1)}>
              <Home size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Root
            </span>
            {folderPath.map((f, idx) => (
              <React.Fragment key={f.id}>
                <ChevronRight size={14} color="var(--text-muted)" />
                <span className="breadcrumb-item" onClick={() => handleBreadcrumbClick(idx)}>
                  {f.name}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* SINGLE-CLICK CONTEXTUAL TOOLBAR */}
        {selectedItem && (
          <div className="context-toolbar">
            <div className="context-toolbar-info">
              {selectedItem.is_folder ? <Folder size={18} color="#94a3b8" /> : <FileText size={18} color="#3b82f6" />}
              <span>{selectedItem.name}</span>
            </div>

            <div className="context-toolbar-actions">
              <button
                className="btn-context-action"
                onClick={() => handleDownload(selectedItem)}
              >
                <Download size={14} /> Download
              </button>

              <button
                className="btn-context-action"
                onClick={() => onOpenMoveModal(selectedItem)}
              >
                <Move size={14} /> Move
              </button>

              <button
                className="btn-context-action danger"
                onClick={() => onOpenDeleteModal(selectedItem)}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )}

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
              {activeRoomDetails.files?.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                  <tr
                    key={item.id}
                    className={isSelected ? 'selected-row' : ''}
                    onClick={() => handleRowClick(item)}
                    onDoubleClick={() => handleRowDoubleClick(item)}
                  >
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
                );
              })}
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
