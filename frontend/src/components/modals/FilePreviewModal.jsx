import React, { useEffect, useState } from 'react';
import { X, Download, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { formatFileName } from '../../utils/formatters';

export default function FilePreviewModal({
  isOpen,
  onClose,
  file,
  appJwt,
  BACKEND_URL,
  onDownloadFile,
  showToast,
  onRefreshFiles
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);

  useEffect(() => {
    if (isOpen && file && file.gdrive_file_id) {
      let isMounted = true;
      setIsVerifying(true);
      setVerificationError(null);

      fetch(`${BACKEND_URL}/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      })
        .then(async (res) => {
          if (!isMounted) return;
          if (res.status === 404) {
            const data = await res.json().catch(() => ({}));
            const msg = data.detail || 'File missing from Google Drive account; database record cleaned up.';
            if (showToast) showToast(msg, 'error');
            if (onRefreshFiles) onRefreshFiles();
            onClose();
          } else if (!res.ok) {
            setVerificationError('Unable to verify cloud storage status');
          }
        })
        .catch(() => {
          if (isMounted) setVerificationError('Network error checking file availability');
        })
        .finally(() => {
          if (isMounted) setIsVerifying(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, file, appJwt, BACKEND_URL]);

  if (!isOpen || !file) return null;

  const displayName = formatFileName(file.name);
  const embedUrl = file.gdrive_file_id 
    ? `https://drive.google.com/file/d/${file.gdrive_file_id}/preview`
    : null;

  const handleDownload = () => {
    if (onDownloadFile) {
      onDownloadFile(file);
    } else {
      const downloadUrl = `${BACKEND_URL}/files/${file.id}/download?token=${appJwt}`;
      window.location.href = downloadUrl;
    }
  };

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-header" onClick={(e) => e.stopPropagation()}>
        <div className="preview-title-wrap">
          <FileText size={20} color="var(--emerald-primary)" />
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{displayName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="font-mono">
              Hosted by: {file.host_name || `User #${file.storage_user_id}`} • Uploaded by: {file.uploader_name || `User #${file.uploader_id}`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn-slate" onClick={handleDownload}>
            <Download size={16} />
            <span>Download</span>
          </button>

          {file.gdrive_file_id && (
            <a
              href={`https://drive.google.com/file/d/${file.gdrive_file_id}/view`}
              target="_blank"
              rel="noreferrer"
              className="btn-slate"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={16} />
              <span>Open in Drive</span>
            </a>
          )}

          <button className="close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="preview-body" onClick={(e) => e.stopPropagation()}>
        {isVerifying ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)' }}>
            <RefreshCw className="animate-spin" size={32} color="var(--emerald-primary)" />
            <span>Verifying cloud storage availability...</span>
          </div>
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            className="preview-iframe"
            title={file.name}
            allow="autoplay"
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
            <FileText size={64} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--emerald-primary)' }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>{file.name}</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
              In-app web preview is unavailable for this file format. Click below to download the file directly.
            </p>
            <button className="btn-emerald" onClick={handleDownload}>
              <Download size={18} />
              <span>Download File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
