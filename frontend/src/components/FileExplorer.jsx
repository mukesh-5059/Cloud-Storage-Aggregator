import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderPlus, Search, LayoutList, LayoutGrid, Folder, FileText, Image as ImageIcon, 
  Video, Music, Archive, Eye, FolderInput, Info, Trash2, ChevronRight,
  Download, ExternalLink, MousePointerClick, Edit2, RefreshCw,
  ArrowUp, ArrowDown, ArrowUpDown
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

  // File Sorting State: default field 'created_at', default direction 'desc'
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

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

  // Handle Header Column Sorting Toggles
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default directions when switching to a new column
      if (field === 'name' || field === 'host_name' || field === 'uploader_name') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  // Rule: Folders ALWAYS listed on top of normal files, then sorted within their category
  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    return [...items].sort((a, b) => {
      // Rule 1: Folders always come before files
      if (a.is_folder !== b.is_folder) {
        return a.is_folder ? -1 : 1;
      }

      // Rule 2: Sort items within the same category (folders vs files)
      let comparison = 0;
      if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'host_name') {
        const valA = a.is_folder ? '' : (a.host_name || '');
        const valB = b.is_folder ? '' : (b.host_name || '');
        comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'uploader_name') {
        const valA = a.uploader_name || '';
        const valB = b.uploader_name || '';
        comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'size_bytes') {
        comparison = (a.size_bytes || 0) - (b.size_bytes || 0);
      } else if (sortField === 'created_at') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.id || 0);
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.id || 0);
        comparison = timeA - timeB;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, sortField, sortDirection]);

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

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} style={{ opacity: 0.35, marginLeft: 4 }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={13} style={{ color: 'var(--emerald-primary)', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={13} style={{ color: 'var(--emerald-primary)', marginLeft: 4 }} />
    );
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

      {/* Selected Item Action Bar */}
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
        ) : (!sortedItems || sortedItems.length === 0) ? (
          <div className="explorer-empty-state">
            <Folder size={48} className="explorer-empty-icon" />
            <p className="explorer-empty-title">This folder is empty</p>
            <p className="explorer-empty-subtext">
              Upload a file or create a folder to start pooling storage
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="file-grid">
            {sortedItems.map((item) => {
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
                <th
                  className={`sortable-th ${sortField === 'name' ? 'active' : ''}`}
                  onClick={() => handleSort('name')}
                  style={{ width: '36%' }}
                >
                  <div className="th-sort-content">
                    <span>NAME</span>
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th
                  className={`sortable-th ${sortField === 'host_name' ? 'active' : ''}`}
                  onClick={() => handleSort('host_name')}
                  style={{ width: '17%' }}
                >
                  <div className="th-sort-content">
                    <span>HOSTED BY</span>
                    {renderSortIcon('host_name')}
                  </div>
                </th>
                <th
                  className={`sortable-th ${sortField === 'uploader_name' ? 'active' : ''}`}
                  onClick={() => handleSort('uploader_name')}
                  style={{ width: '17%' }}
                >
                  <div className="th-sort-content">
                    <span>UPLOADED BY</span>
                    {renderSortIcon('uploader_name')}
                  </div>
                </th>
                <th
                  className={`sortable-th ${sortField === 'size_bytes' ? 'active' : ''}`}
                  onClick={() => handleSort('size_bytes')}
                  style={{ width: '12%' }}
                >
                  <div className="th-sort-content">
                    <span>SIZE</span>
                    {renderSortIcon('size_bytes')}
                  </div>
                </th>
                <th
                  className={`sortable-th ${sortField === 'created_at' ? 'active' : ''}`}
                  onClick={() => handleSort('created_at')}
                  style={{ width: '18%' }}
                >
                  <div className="th-sort-content">
                    <span>UPLOAD DATE</span>
                    {renderSortIcon('created_at')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => {
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
