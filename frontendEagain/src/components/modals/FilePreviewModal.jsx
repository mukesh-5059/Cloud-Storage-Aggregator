import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';

export default function FilePreviewModal({ isOpen, onClose, file, appJwt, BACKEND_URL, onDownloadFile }) {
  if (!isOpen || !file) return null;

  const embedUrl = file.gdrive_file_id 
    ? `https://drive.google.com/file/d/${file.gdrive_file_id}/preview`
    : null;

  const handleDownload = () => {
    if (onDownloadFile) {
      onDownloadFile(file);
    } else {
      const downloadUrl = `${BACKEND_URL}/files/${file.id}/download`;
      fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${appJwt}` }
      })
        .then(res => res.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        })
        .catch(err => console.error('Download failed:', err));
    }
  };

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-header" onClick={(e) => e.stopPropagation()}>
        <div className="preview-title-wrap">
          <FileText size={20} color="var(--emerald-primary)" />
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{file.name}</div>
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
        {embedUrl ? (
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
