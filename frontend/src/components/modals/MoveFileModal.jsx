import React, { useState, useEffect } from 'react';
import { X, FolderInput, Folder, FolderPlus, ChevronRight, Check, RefreshCw } from 'lucide-react';
import { formatFileName } from '../../utils/formatters';

export default function MoveFileModal({
  isOpen,
  onClose,
  fileToMove,
  activeRoomId,
  appJwt,
  onMoveSuccess,
  BACKEND_URL
}) {
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Room Root' }]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moving, setMoving] = useState(false);

  // Fetch folders in current directory
  useEffect(() => {
    if (!isOpen || !activeRoomId) return;

    const fetchDirectoryFolders = async () => {
      setLoading(true);
      try {
        const parentQuery = currentFolderId ? `?parent_id=${currentFolderId}` : '';
        const res = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}${parentQuery}`, {
          headers: { Authorization: `Bearer ${appJwt}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter only directories (is_folder === true), excluding fileToMove itself if it's a folder
          const subfolders = data.filter(i => i.is_folder && i.id !== fileToMove?.id);
          setFolders(subfolders);
        }
      } catch (err) {
        console.error('Failed to fetch folders for move modal:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectoryFolders();
  }, [isOpen, activeRoomId, currentFolderId, appJwt, fileToMove, BACKEND_URL]);

  if (!isOpen || !fileToMove) return null;

  const handleNavigateSubfolder = (folder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateBreadcrumb = (crumb, idx) => {
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
  };

  const handleCreateFolderInModal = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}/folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ name: newFolderName.trim(), parent_id: currentFolderId })
      });
      if (res.ok) {
        const newFolder = await res.json();
        setFolders(prev => [...prev, newFolder]);
        setNewFolderName('');
        setCreatingFolder(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveHere = async () => {
    if (currentFolderId === fileToMove.parent_id) {
      onClose();
      return;
    }

    setMoving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/files/${fileToMove.id}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ new_parent_id: currentFolderId })
      });

      if (res.ok) {
        const updatedItem = await res.json();
        onMoveSuccess(updatedItem);
        onClose();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to move item');
        if (res.status === 404 && onMoveSuccess) {
          onMoveSuccess(fileToMove);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <FolderInput size={20} color="var(--emerald-primary)" />
            <span>Move "{formatFileName(fileToMove.name)}"</span>
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Breadcrumb Path */}
        <div className="breadcrumbs" style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-medium)' }}>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id || 'root'}>
              {idx > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
              <span
                className={`breadcrumb-item ${idx === breadcrumbs.length - 1 ? 'breadcrumb-current' : ''}`}
                onClick={() => handleNavigateBreadcrumb(crumb, idx)}
              >
                {crumb.name}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Folder Directory List */}
        <div style={{
          maxHeight: '220px',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: '8px',
          padding: '8px'
        }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="skeleton-box" style={{ height: '36px', borderRadius: '6px' }} />
              ))}
            </div>
          ) : folders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No subfolders in this directory
            </div>
          ) : (
            folders.map((f) => (
              <div
                key={f.id}
                onClick={() => handleNavigateSubfolder(f)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  transition: 'background var(--transition-fast)'
                }}
                className="file-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Folder size={18} color="var(--amber-status)" />
                  <span>{f.name}</span>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            ))
          )}
        </div>

        {/* Inline Create Folder Form inside Modal */}
        {creatingFolder ? (
          <form onSubmit={handleCreateFolderInModal} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-emerald" style={{ padding: '6px 12px' }}>
              Create
            </button>
            <button type="button" className="btn-slate" style={{ padding: '6px 12px' }} onClick={() => setCreatingFolder(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn-slate" onClick={() => setCreatingFolder(true)} style={{ fontSize: '0.8rem' }}>
              <FolderPlus size={16} />
              <span>New Folder</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-slate" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-emerald" onClick={handleMoveHere} disabled={moving}>
                {moving ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Moving...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Move Here</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
