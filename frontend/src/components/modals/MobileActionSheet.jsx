import React from 'react';
import { 
  X, Eye, Download, ExternalLink, Edit2, FolderInput, Info, Trash2, 
  Folder, FileText, Image as ImageIcon, Video, Music, Archive 
} from 'lucide-react';
import { formatBytes, formatFileName } from '../../utils/formatters';

function getItemIcon(item) {
  if (item.is_folder) return <Folder size={26} color="var(--amber-status)" />;
  const mime = item.mime_type || '';
  const ext = item.name.split('.').pop().toLowerCase();

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return <ImageIcon size={26} color="var(--emerald-primary)" />;
  }
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov'].includes(ext)) {
    return <Video size={26} color="var(--emerald-primary)" />;
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return <Music size={26} color="var(--emerald-primary)" />;
  }
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return <Archive size={26} color="var(--emerald-primary)" />;
  }
  return <FileText size={26} color="var(--emerald-primary)" />;
}

export default function MobileActionSheet({
  isOpen,
  onClose,
  item,
  onPreview,
  onDownload,
  onOpenDrive,
  onRename,
  onMove,
  onInfo,
  onDelete
}) {
  if (!isOpen || !item) return null;

  const displayName = formatFileName(item.name);

  return (
    <div className="action-sheet-overlay" onClick={onClose}>
      <div className="action-sheet-content" onClick={(e) => e.stopPropagation()}>
        {/* Grab Handle */}
        <div className="action-sheet-handle" />

        {/* Item Overview Header */}
        <div className="action-sheet-header">
          <div className="action-sheet-icon">
            {getItemIcon(item)}
          </div>
          <div className="action-sheet-title-wrap">
            <div className="action-sheet-title">{displayName}</div>
            <div className="action-sheet-subtext font-mono">
              {item.is_folder ? 'Directory Folder' : formatBytes(item.size_bytes)}
              {!item.is_folder && ` • Hosted by: ${item.host_name || `User #${item.storage_user_id}`}`}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Action Options List */}
        <div className="action-sheet-menu">
          <button
            className="action-sheet-btn"
            onClick={() => {
              onClose();
              onPreview(item);
            }}
          >
            <Eye size={18} color="var(--emerald-primary)" />
            <span>{item.is_folder ? 'Open Folder' : 'Preview File'}</span>
          </button>

          {!item.is_folder && onDownload && (
            <button
              className="action-sheet-btn"
              onClick={() => {
                onClose();
                onDownload(item);
              }}
            >
              <Download size={18} color="var(--emerald-primary)" />
              <span>Download File</span>
            </button>
          )}

          {!item.is_folder && item.gdrive_file_id && onOpenDrive && (
            <a
              href={`https://drive.google.com/file/d/${item.gdrive_file_id}/view`}
              target="_blank"
              rel="noreferrer"
              className="action-sheet-btn"
              style={{ textDecoration: 'none' }}
              onClick={onClose}
            >
              <ExternalLink size={18} color="var(--emerald-primary)" />
              <span>Open in Google Drive</span>
            </a>
          )}

          <button
            className="action-sheet-btn"
            onClick={() => {
              onClose();
              onRename(item);
            }}
          >
            <Edit2 size={18} color="var(--text-main)" />
            <span>Rename</span>
          </button>

          <button
            className="action-sheet-btn"
            onClick={() => {
              onClose();
              onMove(item);
            }}
          >
            <FolderInput size={18} color="var(--text-main)" />
            <span>Move to Folder</span>
          </button>

          <button
            className="action-sheet-btn"
            onClick={() => {
              onClose();
              onInfo(item);
            }}
          >
            <Info size={18} color="var(--text-main)" />
            <span>File Details & Info</span>
          </button>

          <button
            className="action-sheet-btn destructive"
            onClick={() => {
              onClose();
              onDelete(item);
            }}
          >
            <Trash2 size={18} color="var(--red-status)" />
            <span>Delete {item.is_folder ? 'Folder' : 'File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
