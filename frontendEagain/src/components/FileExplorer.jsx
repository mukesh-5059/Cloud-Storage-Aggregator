import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Grid, List, Folder, FileText, Film, FileCode, HardDrive, User, ChevronUp, ChevronDown,
  Eye, FolderInput, Trash2, Info, X, CheckSquare, FolderPlus
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:8000';

export default function FileExplorer({ activeRoom, currentUser, appJwt, onTriggerRefresh }) {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [pathHistory, setPathHistory] = useState([{ id: null, name: 'Home' }]); // Array of {id, name}
  const [files, setFiles] = useState([]);
  const [selectedFileModal, setSelectedFileModal] = useState(null); // Item details modal state
  const [activeSelectedItem, setActiveSelectedItem] = useState(null); // Single click active selection
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState(null);

  // Sorting state: default is 'name' ASC with folders first always
  const [sortKey, setSortKey] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const searchInputRef = useRef(null);

  const currentFolder = pathHistory[pathHistory.length - 1];

  // Keydown listener for '/' hotkey to focus search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch files from backend when room or current folder changes
  useEffect(() => {
    if (activeRoom && appJwt) {
      if (searchQuery.trim().length > 0) {
        handleSearchFiles();
      } else {
        fetchFiles();
      }
    } else {
      setFiles([]);
    }
  }, [activeRoom, pathHistory, appJwt]);

  // Debounced search
  useEffect(() => {
    if (!activeRoom || !appJwt) return;
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        handleSearchFiles();
      } else {
        fetchFiles();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchFiles = async () => {
    if (!activeRoom || !appJwt) return;
    try {
      const parentQuery = currentFolder.id ? `?parent_id=${currentFolder.id}` : '';
      const res = await fetch(`${BACKEND_URL}/files/room/${activeRoom.id}${parentQuery}`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFiles(data);
      }
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  const handleSearchFiles = async () => {
    if (!activeRoom || !appJwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/files/room/${activeRoom.id}/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFiles(data);
      }
    } catch (err) {
      console.error("Failed to search files:", err);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || !activeRoom) return;
    try {
      const res = await fetch(`${BACKEND_URL}/files/room/${activeRoom.id}/folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({
          name: newFolderName,
          parent_id: currentFolder.id
        })
      });
      if (res.ok) {
        setNewFolderName('');
        setIsNewFolderModalOpen(false);
        fetchFiles();
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const handleDeleteItem = async (fileId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        setActiveSelectedItem(null);
        fetchFiles();
        if (onTriggerRefresh) onTriggerRefresh();
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const handleMoveItem = async (e) => {
    e.preventDefault();
    if (!activeSelectedItem) return;
    try {
      const res = await fetch(`${BACKEND_URL}/files/${activeSelectedItem.id}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({
          new_parent_id: targetMoveFolderId ? Number(targetMoveFolderId) : null
        })
      });
      if (res.ok) {
        setIsMoveModalOpen(false);
        setActiveSelectedItem(null);
        fetchFiles();
      }
    } catch (err) {
      console.error("Failed to move item:", err);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.is_folder) return <Folder size={20} color="var(--accent-amber)" />;
    if (file.name.endsWith('.mp4') || file.name.endsWith('.mkv')) return <Film size={20} color="var(--accent-rose)" />;
    if (file.name.endsWith('.pdf')) return <FileText size={20} color="var(--accent-cyan)" />;
    if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) return <FileCode size={20} color="var(--accent-emerald)" />;
    return <FileText size={20} color="var(--text-secondary)" />;
  };

  // Single Click Handler: Selects item
  const handleSingleClick = (file) => {
    setActiveSelectedItem(file);
  };

  // Double Click Handler: Opens folder or previews file details
  const handleDoubleClick = (file) => {
    if (file.is_folder) {
      setPathHistory(prev => [...prev, { id: file.id, name: file.name }]);
      setActiveSelectedItem(null);
    } else {
      setSelectedFileModal(file);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleBreadcrumbClick = (index) => {
    setPathHistory(prev => prev.slice(0, index + 1));
    setActiveSelectedItem(null);
  };

  // Folders ALWAYS first, then sorted by active key
  const sortedFiles = [...files].sort((a, b) => {
    if (a.is_folder && !b.is_folder) return -1;
    if (!a.is_folder && b.is_folder) return 1;

    let valA = a.name.toLowerCase();
    let valB = b.name.toLowerCase();

    if (sortKey === 'size') {
      valA = a.size_bytes;
      valB = b.size_bytes;
    } else if (sortKey === 'date') {
      valA = a.created_at;
      valB = b.created_at;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortIndicator = (key) => {
    if (sortKey !== key) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} style={{ display: 'inline', marginLeft: '4px' }} /> : <ChevronDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />;
  };

  return (
    <main className="central-explorer">
      {/* Explorer Search & View Switcher Bar */}
      <div className="explorer-toolbar" style={{ marginBottom: '12px' }}>
        <div className="breadcrumbs-bar" style={{ marginBottom: 0 }}>
          <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {activeRoom ? activeRoom.name : 'Storage Pool'}
          </span>
          {pathHistory.map((folder, idx) => (
            <React.Fragment key={idx}>
              <span>/</span>
              <span 
                className="breadcrumb-item" 
                onClick={() => handleBreadcrumbClick(idx)}
              >
                {folder.name}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn-secondary-action" 
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            onClick={() => setIsNewFolderModalOpen(true)}
          >
            <FolderPlus size={16} /> New Folder
          </button>

          <div className="search-input-box">
            <Search size={16} color="var(--text-muted)" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search pooled files... (press '/' to focus)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={18} />
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* FIXED-HEIGHT CONTEXT ACTION BAR SLOT (38px) */}
      <div style={{
        height: '38px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        backgroundColor: activeSelectedItem ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-card)',
        border: activeSelectedItem ? '1px solid var(--border-glow)' : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
      }}>
        {activeSelectedItem ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
              <CheckSquare size={16} />
              <span>Selected: <strong>{activeSelectedItem.name}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn-secondary-action" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => handleDoubleClick(activeSelectedItem)}
              >
                <Eye size={14} /> Open
              </button>
              <button 
                className="btn-secondary-action" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setIsMoveModalOpen(true)}
              >
                <FolderInput size={14} /> Move
              </button>
              <button 
                className="btn-secondary-action" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setSelectedFileModal(activeSelectedItem)}
              >
                <Info size={14} /> Info
              </button>
              <button 
                className="btn-secondary-action" 
                style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                onClick={() => handleDeleteItem(activeSelectedItem.id)}
              >
                <Trash2 size={14} /> Delete
              </button>
              <X 
                size={16} 
                color="var(--text-muted)" 
                style={{ cursor: 'pointer', marginLeft: '6px' }}
                onClick={() => setActiveSelectedItem(null)}
                title="Clear selection"
              />
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Single-click item for options • Double-click to open
          </div>
        )}
      </div>

      {/* Files Table View */}
      {files.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No files or folders found in this directory.
        </div>
      ) : viewMode === 'table' ? (
        <table className="file-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>
                Name {renderSortIndicator('name')}
              </th>
              <th>Hosted By</th>
              <th>Uploaded By</th>
              <th onClick={() => handleSort('size')}>
                Size {renderSortIndicator('size')}
              </th>
              <th onClick={() => handleSort('date')}>
                Upload Date {renderSortIndicator('date')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map((file) => {
              const isSelected = activeSelectedItem?.id === file.id;
              return (
                <tr 
                  key={file.id}
                  onClick={() => handleSingleClick(file)}
                  onDoubleClick={() => handleDoubleClick(file)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    outline: isSelected ? '1px solid var(--accent-cyan)' : 'none'
                  }}
                >
                  <td className="file-name-cell">
                    {getFileIcon(file)}
                    <span>{file.name}</span>
                  </td>
                  <td>
                    {file.is_folder ? '—' : (
                      <span className="host-badge">
                        <HardDrive size={12} color="var(--accent-cyan)" />
                        {file.host_name || 'Unknown'}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="uploader-badge">
                      <User size={12} />
                      {file.uploader_name || 'Unknown'}
                    </span>
                  </td>
                  <td>{file.is_folder ? '—' : formatBytes(file.size_bytes)}</td>
                  <td>{new Date(file.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        /* Files Grid View */
        <div className="file-grid">
          {sortedFiles.map((file) => {
            const isSelected = activeSelectedItem?.id === file.id;
            return (
              <div 
                key={file.id} 
                className="file-card"
                onClick={() => handleSingleClick(file)}
                onDoubleClick={() => handleDoubleClick(file)}
                style={{
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  boxShadow: isSelected ? 'var(--shadow-glow-cyan)' : 'none'
                }}
              >
                <div className="file-card-preview">
                  {getFileIcon(file)}
                </div>
                <div className="file-card-title">{file.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                  {!file.is_folder && (
                    <span className="host-badge" style={{ width: 'fit-content' }}>
                      <HardDrive size={10} /> Host: {file.host_name || 'Unknown'}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Uploaded by: {file.uploader_name || 'Unknown'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {file.is_folder ? 'Folder' : formatBytes(file.size_bytes)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create New Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-header)' }}>New Folder</h2>
              <X size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setIsNewFolderModalOpen(false)} />
            </div>
            <form onSubmit={handleCreateFolder}>
              <input 
                type="text" 
                placeholder="Folder name" 
                value={newFolderName} 
                onChange={(e) => setNewFolderName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-rail)', color: '#fff', marginBottom: '16px' }}
                autoFocus
              />
              <button className="btn-primary-action" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                Create Folder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Move File/Folder Modal */}
      {isMoveModalOpen && activeSelectedItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-header)' }}>Move "{activeSelectedItem.name}"</h2>
              <X size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setIsMoveModalOpen(false)} />
            </div>
            <form onSubmit={handleMoveItem}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Select target folder ID (or leave blank to move to Root):
              </p>
              <select 
                value={targetMoveFolderId || ''} 
                onChange={(e) => setTargetMoveFolderId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-rail)', color: '#fff', marginBottom: '16px' }}
              >
                <option value="">Root / Home Directory</option>
                {files.filter(f => f.is_folder && f.id !== activeSelectedItem.id).map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
              <button className="btn-primary-action" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                Move Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Selected File Details Modal */}
      {selectedFileModal && (
        <div className="modal-overlay" onClick={() => setSelectedFileModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {getFileIcon(selectedFileModal)}
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-header)' }}>
                {selectedFileModal.name}
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--text-normal)' }}>
              <div><strong>Item Type:</strong> {selectedFileModal.is_folder ? 'Folder' : (selectedFileModal.mime_type || 'File')}</div>
              {!selectedFileModal.is_folder && <div><strong>Hosted By (GDrive Owner):</strong> {selectedFileModal.host_name || 'Unknown'}</div>}
              <div><strong>Uploaded By:</strong> {selectedFileModal.uploader_name || 'Unknown'}</div>
              {!selectedFileModal.is_folder && <div><strong>File Size:</strong> {formatBytes(selectedFileModal.size_bytes)}</div>}
              <div><strong>Date Uploaded:</strong> {new Date(selectedFileModal.created_at).toLocaleString()}</div>
            </div>
            <button 
              className="btn-primary-action" 
              style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}
              onClick={() => setSelectedFileModal(null)}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

