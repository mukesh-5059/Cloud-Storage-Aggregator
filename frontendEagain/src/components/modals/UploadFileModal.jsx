import React, { useState, useRef } from 'react';
import { X, UploadCloud, File, AlertCircle } from 'lucide-react';

export default function UploadFileModal({
  isOpen,
  onClose,
  activeRoomId,
  currentFolderId,
  appJwt,
  onUploadSuccess,
  BACKEND_URL
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const activeXhrRef = useRef(null);
  const uploadUrlRef = useRef(null);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (activeXhrRef.current) {
      console.log('[UploadFileModal] Aborting active Google Drive upload...');
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    if (uploadUrlRef.current) {
      console.log('[UploadFileModal] Sending DELETE request to purge partial upload session on Google Drive...');
      fetch(uploadUrlRef.current, { method: 'DELETE' }).catch((err) => {
        console.warn('Failed to send DELETE to Google Drive upload session:', err);
      });
      uploadUrlRef.current = null;
    }
    setUploading(false);
    setSelectedFile(null);
    setProgress(0);
    setErrorMessage(null);
    onClose();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleStartUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !activeRoomId) return;

    setUploading(true);
    setProgress(0);
    setErrorMessage(null);
    setStatusText('Step 1/3: Requesting upload intent from backend...');

    try {
      // Step 1: Request upload intent from FastAPI backend
      const intentPayload = {
        name: selectedFile.name,
        size_bytes: selectedFile.size,
        mime_type: selectedFile.type || 'application/octet-stream',
        parent_id: currentFolderId
      };

      const intentRes = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}/upload-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify(intentPayload)
      });

      if (!intentRes.ok) {
        const err = await intentRes.json();
        throw new Error(err.detail || 'Upload intent failed');
      }

      const { upload_url, storage_user_id, storage_user_name } = await intentRes.json();
      uploadUrlRef.current = upload_url;
      setStatusText(`Step 2/3: Uploading binary directly to ${storage_user_name}'s Google Drive...`);

      // Step 2: Direct Binary Transfer via XHR PUT to upload_url (with progress tracking)
      const gdriveFileId = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        activeXhrRef.current = xhr;
        xhr.open('PUT', upload_url, true);

        if (selectedFile.type) {
          xhr.setRequestHeader('Content-Type', selectedFile.type);
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          activeXhrRef.current = null;
          console.log(`[Google Drive XHR] Status: ${xhr.status}, Response:`, xhr.responseText);
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

        xhr.send(selectedFile);
      });

      console.log('Obtained gdrive_file_id:', gdriveFileId);

      if (!gdriveFileId) {
        throw new Error('Google Drive binary upload finished, but failed to extract file ID from Google response. Check browser console logs.');
      }

      // Step 3: Complete Upload confirmation call to FastAPI backend
      setStatusText('Step 3/3: Registering file in room database...');
      const completePayload = {
        gdrive_file_id: gdriveFileId,
        name: selectedFile.name,
        size_bytes: selectedFile.size,
        mime_type: selectedFile.type || 'application/octet-stream',
        parent_id: currentFolderId,
        storage_user_id: storage_user_id
      };

      const completeRes = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}/complete-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify(completePayload)
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.detail || 'Failed to complete upload registration');
      }

      const newFileItem = await completeRes.json();
      onUploadSuccess(newFileItem);
      setSelectedFile(null);
      onClose();
    } catch (err) {
      if (err.message === 'Upload aborted by user') {
        console.log('Upload workflow cancelled by user.');
        return;
      }
      console.error(err);
      setErrorMessage(err.message || 'Upload process failed');
    } finally {
      activeXhrRef.current = null;
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <UploadCloud size={20} color="var(--emerald-primary)" />
            <span>Upload File</span>
          </h2>
          <button className="close-btn" onClick={handleCancel}>
            <X size={20} />
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
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleStartUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            border: '2px dashed var(--border-medium)',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            cursor: 'pointer'
          }} onClick={() => document.getElementById('file-upload-input')?.click()}>
            <input
              id="file-upload-input"
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <File size={36} color="var(--emerald-primary)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
            {selectedFile ? (
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{selectedFile.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} className="font-mono">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Click to select a file</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supports documents, images, videos, audio, and archives
                </div>
              </div>
            )}
          </div>

          {uploading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{statusText}</div>
              <div className="storage-progress-track" style={{ height: '6px' }}>
                <div className="storage-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--emerald-primary)', textAlign: 'right' }}>
                {progress}%
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-slate" onClick={handleCancel}>
              {uploading ? 'Abort Upload' : 'Cancel'}
            </button>
            <button type="submit" className="btn-emerald" disabled={!selectedFile || uploading}>
              {uploading ? 'Uploading...' : 'Start Resumable Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
