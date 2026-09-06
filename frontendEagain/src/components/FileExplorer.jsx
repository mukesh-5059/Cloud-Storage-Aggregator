import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, Search, LayoutList, LayoutGrid, Folder, FileText, Image as ImageIcon, 
  Video, Music, Archive, Eye, FolderInput, Info, Trash2, ChevronRight 
} from 'lucide-react';

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || !bytes) return '—';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateString;
  }
}

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

export default function FileExplorer({
  items,
  breadcrumbs,
  onNavigateBreadcrumb,
  onNavigateFolder,
  onOpenNewFolderModal,
  onOpenMoveModal,
  onOpenInfoDrawer,
  onOpenPreview,
  onDeleteFile,
  searchQuery,
  onSearchChange
}) {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [selectedId, setSelectedId] = useState(null);

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
          <button className="btn-slate" onClick={onOpenNewFolderModal}>
            <FolderPlus size={16} />
            <span>New Folder</span>
          </button>

          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              id="room-file-search"
              type="text"
              className="search-input"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <span className="search-shortcut-badge font-mono">/</span>
          </div>

          <button
            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            title="Toggle View Mode"
          >
            {viewMode === 'list' ? <LayoutList size={18} /> : <LayoutGrid size={18} />}
          </button>
        </div>
      </div>

      {/* Selected Item Action Bar */}
      {selectedItem && (
        <div className="selection-action-bar">
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
        </div>
      )}

      {/* File Explorer Table View */}
      <div className="file-table-wrapper">
        {(!items || items.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <Folder size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.9rem' }}>This folder is empty</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Upload a file or create a folder to start pooling storage
            </p>
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
}
