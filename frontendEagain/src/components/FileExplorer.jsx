import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Grid, List, Folder, FileText, Film, FileCode, HardDrive, User, ChevronUp, ChevronDown,
  Eye, FolderInput, Trash2, Info, X, CheckSquare
} from 'lucide-react';

export default function FileExplorer({ activeRoom, currentUser }) {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPath, setCurrentPath] = useState(['Home']);
  const [selectedFile, setSelectedFile] = useState(null); // Item details modal state
  const [activeSelectedItem, setActiveSelectedItem] = useState(null); // Single click active selection

  // Sorting state: default is 'name' ASC with folders first always
  const [sortKey, setSortKey] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const searchInputRef = useRef(null);

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

  // Mock file dataset
  const [files, setFiles] = useState([
    { id: 1, title: 'Documents', type: 'folder', size: 0, hostName: 'Mukesh', uploaderName: 'Mukesh', date: '2026-09-01', isFolder: true },
    { id: 2, title: 'Media Assets', type: 'folder', size: 0, hostName: 'Sarah', uploaderName: 'Sarah', date: '2026-09-02', isFolder: true },
    { id: 3, title: 'presentation_deck.pdf', type: 'pdf', size: 4850000, hostName: 'Mukesh', uploaderName: 'Mukesh', date: '2026-09-04', isFolder: false },
    { id: 4, title: 'dataset_raw.csv', type: 'csv', size: 154000000, hostName: 'Sarah', uploaderName: 'Alex', date: '2026-09-03', isFolder: false },
    { id: 5, title: 'system_architecture.mp4', type: 'video', size: 1250000000, hostName: 'Alex', uploaderName: 'Sarah', date: '2026-09-05', isFolder: false }
  ]);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.isFolder) return <Folder size={20} color="var(--accent-amber)" />;
    if (file.title.endsWith('.mp4') || file.title.endsWith('.mkv')) return <Film size={20} color="var(--accent-rose)" />;
    if (file.title.endsWith('.pdf')) return <FileText size={20} color="var(--accent-cyan)" />;
    if (file.title.endsWith('.csv') || file.title.endsWith('.xlsx')) return <FileCode size={20} color="var(--accent-emerald)" />;
    return <FileText size={20} color="var(--text-secondary)" />;
  };

  // Single Click Handler: Selects item and reveals fixed-height Action Bar
  const handleSingleClick = (file) => {
    setActiveSelectedItem(file);
  };

  // Double Click Handler: Opens folder or previews file
  const handleDoubleClick = (file) => {
    if (file.isFolder) {
      setCurrentPath(prev => [...prev, file.title]);
      setActiveSelectedItem(null);
    } else {
      setSelectedFile(file);
    }
  };

  const handleDeleteItem = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setActiveSelectedItem(null);
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
    setCurrentPath(prev => prev.slice(0, index + 1));
    setActiveSelectedItem(null);
  };

  // Folders ALWAYS first, then sorted by active key
  const sortedFiles = [...files]
    .filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let valA = a.title.toLowerCase();
      let valB = b.title.toLowerCase();

      if (sortKey === 'host') {
        valA = a.hostName.toLowerCase();
        valB = b.hostName.toLowerCase();
      } else if (sortKey === 'size') {
        valA = a.size;
        valB = b.size;
      } else if (sortKey === 'date') {
        valA = a.date;
        valB = b.date;
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
          {currentPath.map((folder, idx) => (
            <React.Fragment key={idx}>
              <span>/</span>
              <span 
                className="breadcrumb-item" 
                onClick={() => handleBreadcrumbClick(idx)}
              >
                {folder}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

      {/* FIXED-HEIGHT CONTEXT ACTION BAR SLOT (38px) - Prevents Layout Shifting! */}
      <div style={{
        height: '38px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
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
              <span>Selected: <strong>{activeSelectedItem.title}</strong></span>
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
                onClick={() => alert(`Moving "${activeSelectedItem.title}"`)}
              >
                <FolderInput size={14} /> Move
              </button>
              <button 
                className="btn-secondary-action" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setSelectedFile(activeSelectedItem)}
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
      {viewMode === 'table' ? (
        <table className="file-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>
                Name {renderSortIndicator('name')}
              </th>
              <th onClick={() => handleSort('host')}>
                Host (GDrive Owner) {renderSortIndicator('host')}
              </th>
              <th>Uploaded By</th>
              <th onClick={() => handleSort('size')}>
                Size {renderSortIndicator('size')}
              </th>
              <th onClick={() => handleSort('date')}>
                Date {renderSortIndicator('date')}
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
                    <span>{file.title}</span>
                  </td>
                  <td>
                    <span className="host-badge">
                      <HardDrive size={12} color="var(--accent-cyan)" />
                      {file.hostName}
                    </span>
                  </td>
                  <td>
                    <span className="uploader-badge">
                      <User size={12} />
                      {file.uploaderName}
                    </span>
                  </td>
                  <td>{formatBytes(file.size)}</td>
                  <td>{file.date}</td>
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
                <div className="file-card-title">{file.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                  <span className="host-badge" style={{ width: 'fit-content' }}>
                    <HardDrive size={10} /> Host: {file.hostName}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{formatBytes(file.size)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected File Details Modal */}
      {selectedFile && (
        <div className="modal-overlay" onClick={() => setSelectedFile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {getFileIcon(selectedFile)}
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-header)' }}>
                {selectedFile.title}
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--text-normal)' }}>
              <div><strong>GDrive Physical Host:</strong> {selectedFile.hostName}</div>
              <div><strong>Uploaded By:</strong> {selectedFile.uploaderName}</div>
              <div><strong>File Size:</strong> {formatBytes(selectedFile.size)}</div>
              <div><strong>Date Uploaded:</strong> {selectedFile.date}</div>
            </div>
            <button 
              className="btn-primary-action" 
              style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}
              onClick={() => setSelectedFile(null)}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
