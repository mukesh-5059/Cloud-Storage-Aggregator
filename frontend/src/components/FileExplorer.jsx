import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, Search, LayoutList, LayoutGrid, Folder, FileText, Image as ImageIcon, 
  Video, Music, Archive, Eye, FolderInput, Info, Trash2, ChevronRight,
  Download, ExternalLink, MousePointerClick, Edit2, RefreshCw
} from 'lucide-react';
import { formatBytes, formatDate } from '../utils/formatters';

function getFileIcon(item) {
  if (item.is_folder) return <Folder size={18} className="file-icon folder" />;
  const mime = item.mime_type || '';
  const ext = item.name.split('.').pop().toLowerCase();

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return <ImageIcon size={18} className="file-icon" />;
  }
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov'].includes(ext)) {
    return <Video size={18} className="file-icon" />;
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return <Music size={18} className="file-icon" />;
  }
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return <Archive size={18} className="file-icon" />;
  }
  return <FileText size={18} className="file-icon" />;
}

const FileExplorer = React.memo(function FileExplorer({
  activeRoomId,
  items,
  breadcrumbs,
  onNavigateBreadcrumb,
  onNavigateFolder,
  onOpenNewFolderModal,
  onOpenRenameModal,
  onOpenMoveModal,
  onOpenInfoDrawer,
  onOpenPreview,
  onDownloadFile,
  onDeleteFile,
  loadingFiles,
  searchQuery,
  onSearchChange
}) {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [selectedId, setSelectedId] = useState(null);
  const [localSearchInput, setLocalSearchInput] = useState(searchQuery || '');

  // Keep local search input in sync if parent resets searchQuery
  useEffect(() => {
    setLocalSearchInput(searchQuery || '');
  }, [searchQuery]);

  // Keyboard shortcut '/' to focus search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        const searchEl = document.getElementById('room-file-search');
        if (searchEl) searchEl.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedItem = items ? items.find(i => i.id === selectedId) : null;

  const handleRowClick = (item) => {
    if (selectedId === item.id) {
      setSelectedId(null);
    } else {
      setSelectedId(item.id);
    }
  };

  const handleRowDoubleClick = (item) => {
    if (item.is_folder) {
      setSelectedId(null);
      onNavigateFolder(item);
    } else {
      onOpenPreview(item);
    }
  };

  return (
    <div className="explorer-container">
      {/* Explorer Header Toolbar */}
      <div className="explorer-toolbar">
        {/* Breadcrumb Path */}
        <div className="breadcrumbs">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id || 'root'}>
                {idx > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
                <span
                  className={`breadcrumb-item ${isLast ? 'breadcrumb-current' : ''}`}
                  onClick={() => onNavigateBreadcrumb(crumb, idx)}
                >
                  {crumb.name}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* Toolbar Controls */}
        <div className="toolbar-controls">
          {activeRoomId && (
            <button className="btn-slate" onClick={onOpenNewFolderModal}>
              <FolderPlus size={16} />
              <span>New Folder</span>
            </button>
          )}

          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              id="room-file-search"
              type="text"
              className="search-input"
              placeholder="Search files (press Enter)..."
              value={localSearchInput}
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearchInput(val);
                if (val === '') {
                  onSearchChange('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearchChange(localSearchInput.trim());
                } else if (e.key === 'Escape') {
                  setLocalSearchInput('');
                  onSearchChange('');
                }
              }}
            />
            <span className="search-shortcut-badge font-mono">/</span>
          </div>

          <button
            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            title={viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
          >
            {viewMode === 'list' ? <LayoutGrid size={18} /> : <LayoutList size={18} />}
          </button>
        </div>
      </div>

      {/* Selected Item Action Bar (Reserved Height layout container) */}
      <div className={`selection-action-bar ${selectedItem ? 'active' : 'empty'}`}>
        {selectedItem ? (
          <>
            <div className="selection-info">
              <span>Selected: {selectedItem.name}</span>
            </div>

            <div className="selection-actions">
              <button
                className="action-chip"
                onClick={() => handleRowDoubleClick(selectedItem)}
              >
                <Eye size={14} />
                <span>{selectedItem.is_folder ? 'Open Folder' : 'Preview'}</span>
              </button>

              {!selectedItem.is_folder && (
                <button
                  className="action-chip"
                  onClick={() => onDownloadFile(selectedItem)}
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
              )}

              {!selectedItem.is_folder && selectedItem.gdrive_file_id && (
                <a
                  href={`https://drive.google.com/file/d/${selectedItem.gdrive_file_id}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="action-chip"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={14} />
                  <span>Open in Drive</span>
                </a>
              )}

              <button
                className="action-chip"
                onClick={() => onOpenRenameModal(selectedItem)}
              >
                <Edit2 size={14} />
                <span>Rename</span>
              </button>

              <button
                className="action-chip"
                onClick={() => onOpenMoveModal(selectedItem)}
              >
                <FolderInput size={14} />
                <span>Move</span>
              </button>

              <button
                className="action-chip"
                onClick={() => onOpenInfoDrawer(selectedItem)}
              >
                <Info size={14} />
                <span>Info</span>
              </button>

              <button
                className="action-chip destructive"
                onClick={() => {
                  onDeleteFile(selectedItem);
                  setSelectedId(null);
                }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </>
        ) : (
          <div className="selection-placeholder">
            <MousePointerClick size={14} />
            <span>Select an item to view options</span>
          </div>
        )}
      </div>

      {/* File Explorer Content View (List vs Grid) */}
      <div className="file-table-wrapper">
        {loadingFiles ? (
          <div className="explorer-empty-state">
            <RefreshCw className="animate-spin" size={28} color="var(--emerald-primary)" />
            <p className="explorer-empty-title">Loading folder items...</p>
          </div>
        ) : (!items || items.length === 0) ? (
          <div className="explorer-empty-state">
            <Folder size={48} className="explorer-empty-icon" />
            <p className="explorer-empty-title">This folder is empty</p>
            <p className="explorer-empty-subtext">
              Upload a file or create a folder to start pooling storage
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="file-grid">
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  className={`grid-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleRowClick(item)}
                  onDoubleClick={() => handleRowDoubleClick(item)}
                >
                  <div className="grid-card-icon">
                    {getFileIcon(item)}
                  </div>
                  <div className="grid-card-name" title={item.name}>
                    {item.name}
                  </div>
                  <div className="grid-card-meta font-mono">
                    <span>{item.is_folder ? 'Folder' : formatBytes(item.size_bytes)}</span>
                  </div>
                  {!item.is_folder && (
                    <div className="grid-card-host font-mono" title={item.host_name || `User #${item.storage_user_id}`}>
                      Hosted: {item.host_name || `User #${item.storage_user_id}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <table className="file-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>NAME</th>
                <th style={{ width: '15%' }}>HOSTED BY</th>
                <th style={{ width: '15%' }}>UPLOADED BY</th>
                <th style={{ width: '12%' }}>SIZE</th>
                <th style={{ width: '18%' }}>UPLOAD DATE</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <tr
                    key={item.id}
                    className={`file-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleRowClick(item)}
                    onDoubleClick={() => handleRowDoubleClick(item)}
                  >
                    <td>
                      <div className="file-name-cell">
                        {getFileIcon(item)}
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {item.is_folder ? '—' : (item.host_name || `User #${item.storage_user_id}`)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {item.uploader_name || `User #${item.uploader_id}`}
                    </td>
                    <td className="font-mono">
                      {formatBytes(item.size_bytes)}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.78rem' }}>
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});

export default FileExplorer;
