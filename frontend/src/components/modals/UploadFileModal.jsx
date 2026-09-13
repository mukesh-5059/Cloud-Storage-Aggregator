import React, { useState, useRef } from 'react';
import { X, UploadCloud, Files, FolderPlus, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

export default function UploadFileModal({
  isOpen,
  onClose,
  activeRoomId,
  currentFolderId,
  appJwt,
  onUploadSuccess,
  BACKEND_URL
}) {
  const [uploadType, setUploadType] = useState('files'); // 'files' or 'folder'
  const [selectedFiles, setSelectedFiles] = useState([]); // Array of File objects
  const [uploading, setUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileProgress, setCurrentFileProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const activeXhrRef = useRef(null);
  const uploadUrlRef = useRef(null);
  const abortRequestedRef = useRef(false);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(droppedFiles);
      setErrorMessage(null);
    }
  };

  const handleTabChange = (type) => {
    if (uploading) return;
    setUploadType(type);
    setSelectedFiles([]);
    setErrorMessage(null);
  };

  const handleCancel = () => {
    if (uploading) {
      abortRequestedRef.current = true;
      if (activeXhrRef.current) {
        console.log('[UploadModal] Aborting active Google Drive upload XHR...');
        activeXhrRef.current.abort();
        activeXhrRef.current = null;
      }
      if (uploadUrlRef.current) {
        console.log('[UploadModal] Sending DELETE request to purge partial upload session on Google Drive...');
        fetch(uploadUrlRef.current, { method: 'DELETE' }).catch((err) => {
          console.warn('Failed to send DELETE to Google Drive upload session:', err);
        });
        uploadUrlRef.current = null;
      }
      setUploading(false);
      setStatusText('Upload aborted by user');
      return;
    }

    setSelectedFiles([]);
    setErrorMessage(null);
    setCurrentFileProgress(0);
    setCurrentFileIndex(0);
    onClose();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      setErrorMessage(null);
    }
  };

  const getTotalBatchSize = () => {
    return selectedFiles.reduce((acc, f) => acc + f.size, 0);
  };

  // Helper to ensure nested folder exists on backend
  const ensureFolderExists = async (folderPathSegments, createdFoldersCache) => {
    let parentId = currentFolderId;
    let accumulatedPath = '';

    for (const segment of folderPathSegments) {
      if (abortRequestedRef.current) throw new Error('Upload aborted by user');
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment;

      if (createdFoldersCache[accumulatedPath]) {
        parentId = createdFoldersCache[accumulatedPath];
      } else {
        setStatusText(`Creating subfolder "${segment}"...`);
        const res = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}/folder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${appJwt}`
          },
          body: JSON.stringify({ name: segment, parent_id: parentId })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Failed to create folder "${segment}"`);
        }

        const newFolder = await res.json();
        createdFoldersCache[accumulatedPath] = newFolder.id;
        parentId = newFolder.id;
      }
    }

    return parentId;
  };

  // Upload single file binary to Google Drive using pre-fetched intent & register in DB
  const uploadAndCompleteFile = async (file, intent, targetParentId, fileIndex, totalFiles) => {
    const { upload_url, storage_user_id, storage_user_name } = intent;
    uploadUrlRef.current = upload_url;

    if (abortRequestedRef.current) throw new Error('Upload aborted by user');

    // Step 2: Binary transfer via XHR PUT
    setStatusText(`[${fileIndex + 1}/${totalFiles}] Transferring "${file.name}" to ${storage_user_name}'s Google Drive...`);
    setCurrentFileProgress(0);

    const gdriveFileId = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      activeXhrRef.current = xhr;
      xhr.open('PUT', upload_url, true);

      if (file.type) {
        xhr.setRequestHeader('Content-Type', file.type);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setCurrentFileProgress(percent);
        }
      };

      xhr.onload = () => {
        activeXhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = typeof xhr.response === 'object' && xhr.response !== null
              ? xhr.response
              : JSON.parse(xhr.responseText || '{}');
            if (data && data.id) {
              resolve(data.id);
              return;
            }
          } catch (e) {
            console.warn('[Google Drive XHR] JSON parse error:', e);
          }
        }
        resolve(null);
      };

      xhr.onabort = () => {
        activeXhrRef.current = null;
        reject(new Error('Upload aborted by user'));
      };

      xhr.onerror = (err) => {
        activeXhrRef.current = null;
        console.error('[Google Drive XHR] Network error:', err);
        resolve(null);
      };

      xhr.send(file);
    });

    uploadUrlRef.current = null;
    if (abortRequestedRef.current) throw new Error('Upload aborted by user');

    if (!gdriveFileId) {
      throw new Error(`Failed to obtain Google Drive File ID for "${file.name}"`);
    }

    // Step 3: Complete registration call per file (committing to app.db immediately)
    setStatusText(`[${fileIndex + 1}/${totalFiles}] Registering "${file.name}" in database...`);
    const completeRes = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}/complete-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appJwt}`
      },
      body: JSON.stringify({
        gdrive_file_id: gdriveFileId,
        name: file.name,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        parent_id: targetParentId,
        storage_user_id: storage_user_id
      })
    });

    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to complete registration for "${file.name}"`);
    }

    return await completeRes.json();
  };

  const handleStartBatchUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !activeRoomId) return;

    setUploading(true);
    setErrorMessage(null);
    abortRequestedRef.current = false;

    const createdFoldersCache = {}; // path -> folder_id
    let lastUploadedItem = null;

    try {
      // 1. Prepare target parent IDs for all files
      setStatusText('Preparing file metadata and directory hierarchy...');
      const fileTargets = [];
      for (const file of selectedFiles) {
        let targetParentId = currentFolderId;
        if (uploadType === 'folder' && file.webkitRelativePath) {
          const pathSegments = file.webkitRelativePath.split('/');
          const folderSegments = pathSegments.slice(0, -1);
          if (folderSegments.length > 0) {
            targetParentId = await ensureFolderExists(folderSegments, createdFoldersCache);
          }
        }
        fileTargets.push({ file, targetParentId });
      }

      if (abortRequestedRef.current) return;

      // 2. Step 1 of 3: Single Batch Intent request for ALL files at once
      setStatusText(`Requesting batch upload intents for ${selectedFiles.length} files from backend...`);
      const batchIntentPayload = {
        items: fileTargets.map(t => ({
          name: t.file.name,
          size_bytes: t.file.size,
          mime_type: t.file.type || 'application/octet-stream',
          parent_id: t.targetParentId
        }))
      };

      const intentRes = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}/upload-intent-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify(batchIntentPayload)
      });

      if (!intentRes.ok) {
        const errData = await intentRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Batch upload intent failed');
      }

      const { intents } = await intentRes.json();
      if (!intents || intents.length !== selectedFiles.length) {
        throw new Error('Received invalid batch upload intents from backend server');
      }

      // 3. Step 2 & 3: Binary transfer + per-file DB registration
      for (let i = 0; i < selectedFiles.length; i++) {
        if (abortRequestedRef.current) break;

        const { file, targetParentId } = fileTargets[i];
        const intent = intents[i];

        setCurrentFileIndex(i);
        setCurrentFileProgress(0);

        lastUploadedItem = await uploadAndCompleteFile(file, intent, targetParentId, i, selectedFiles.length);
      }

      if (!abortRequestedRef.current) {
        setStatusText('Batch upload complete!');
        if (onUploadSuccess) onUploadSuccess(lastUploadedItem);
        setSelectedFiles([]);
        onClose();
      }
    } catch (err) {
      if (err.message === 'Upload aborted by user') {
        console.log('Batch upload aborted.');
      } else {
        console.error(err);
        setErrorMessage(err.message || 'Batch upload failed');
      }
    } finally {
      activeXhrRef.current = null;
      uploadUrlRef.current = null;
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <UploadCloud size={20} color="var(--emerald-primary)" />
            <span>Upload Content</span>
          </h2>
          <button className="close-btn" onClick={handleCancel}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher: Files vs Folder */}
        <div className="modal-tabs" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={`modal-tab ${uploadType === 'files' ? 'active' : ''}`}
            onClick={() => handleTabChange('files')}
            disabled={uploading}
          >
            <Files size={16} />
            <span>Upload Files</span>
          </button>
          <button
            type="button"
            className={`modal-tab ${uploadType === 'folder' ? 'active' : ''}`}
            onClick={() => handleTabChange('folder')}
            disabled={uploading}
          >
            <FolderPlus size={16} />
            <span>Upload Folder</span>
          </button>
        </div>

        {errorMessage && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'var(--red-bg-tint)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--red-status)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleStartBatchUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dropzone Selector */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed var(--emerald-primary)' : '2px dashed var(--border-medium)',
              borderRadius: '10px',
              padding: '28px 20px',
              textAlign: 'center',
              backgroundColor: isDragging ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-surface)',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)'
            }}
            onClick={() => {
              if (uploading) return;
              if (uploadType === 'files') {
                document.getElementById('multi-files-input')?.click();
              } else {
                document.getElementById('folder-upload-input')?.click();
              }
            }}
          >
            {uploadType === 'files' ? (
              <input
                id="multi-files-input"
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            ) : (
              <input
                id="folder-upload-input"
                type="file"
                webkitdirectory=""
                directory=""
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            )}

            {uploadType === 'files' ? (
              <Files size={38} color="var(--emerald-primary)" style={{ margin: '0 auto 10px', opacity: 0.8 }} />
            ) : (
              <FolderPlus size={38} color="var(--emerald-primary)" style={{ margin: '0 auto 10px', opacity: 0.8 }} />
            )}

            {selectedFiles.length > 0 ? (
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Selected {selectedFiles.length} {selectedFiles.length === 1 ? 'item' : 'items'} ({formatBytes(getTotalBatchSize())})
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--emerald-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <CheckCircle size={14} />
                  <span>Ready to process. Click to re-select.</span>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {uploadType === 'files' ? 'Click to select multiple files' : 'Click to select a directory folder'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {uploadType === 'files'
                    ? 'Select one or more files from your computer'
                    : 'Uploads entire folder structure recursively while preserving subdirectories'}
                </div>
              </div>
            )}
          </div>

          {/* Selected File Preview List */}
          {selectedFiles.length > 0 && (
            <div style={{
              maxHeight: '140px',
              overflowY: 'auto',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-panel)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {selectedFiles.slice(0, 30).map((f, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                    {f.webkitRelativePath || f.name}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {formatBytes(f.size)}
                  </span>
                </div>
              ))}
              {selectedFiles.length > 30 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                  ...and {selectedFiles.length - 30} more items
                </div>
              )}
            </div>
          )}

          {/* Active Upload Batch Status & Progress Bar */}
          {uploading && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw className="animate-spin" size={14} color="var(--emerald-primary)" />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{statusText}</span>
              </div>
              <div className="storage-progress-track" style={{ height: '6px' }}>
                <div className="storage-progress-fill" style={{ width: `${currentFileProgress}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }} className="font-mono">
                <span>File {currentFileIndex + 1} of {selectedFiles.length}</span>
                <span style={{ color: 'var(--emerald-primary)' }}>{currentFileProgress}%</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button type="button" className="btn-slate" onClick={handleCancel}>
              {uploading ? 'Abort Batch' : 'Cancel'}
            </button>
            <button type="submit" className="btn-emerald" disabled={selectedFiles.length === 0 || uploading}>
              {uploading ? 'Processing Batch...' : `Start Upload (${selectedFiles.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
