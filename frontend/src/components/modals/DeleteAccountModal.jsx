import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2, ArrowRightLeft, ShieldAlert, RefreshCw, Crown } from 'lucide-react';

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  appJwt,
  BACKEND_URL,
  onAccountDeleted
}) {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    if (isOpen && appJwt) {
      fetchPreview();
    }
  }, [isOpen, appJwt]);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/users/me/deletion-preview`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to load account deletion preview');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const result = await res.json();
        onAccountDeleted(result);
      } else {
        const err = await res.json();
        setError(err.detail || 'Account deletion failed');
        setDeleting(false);
      }
    } catch (err) {
      console.error(err);
      setError('Server error during account deletion');
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={deleting ? undefined : onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '90vw' }}
      >
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--red-status)' }}>
            <AlertTriangle size={22} color="var(--red-status)" />
            <span>Delete Account & Data Impact</span>
          </h2>
          <button className="close-btn" onClick={onClose} disabled={deleting}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <RefreshCw className="animate-spin" size={32} color="var(--emerald-primary)" />
            <div style={{ fontSize: '0.9rem' }}>Simulating storage bin-packing & room impact preview...</div>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--red-bg-tint)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--red-status)',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-slate" onClick={onClose}>Cancel</button>
              <button className="btn-emerald" onClick={fetchPreview}>Retry Preview</button>
            </div>
          </div>
        ) : previewData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Impact Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              <div style={{
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: 'var(--emerald-bg-tint)',
                border: '1px solid var(--border-emerald)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--emerald-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowRightLeft size={14} />
                  <span>Migratable to Members</span>
                </div>
                <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {previewData.migratable_files_count} files
                </div>
                <div className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {formatBytes(previewData.migratable_bytes)} transferred
                </div>
              </div>

              <div style={{
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: 'var(--red-bg-tint)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--red-status)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={14} />
                  <span>Permanently Cascaded</span>
                </div>
                <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--red-status)' }}>
                  {previewData.cascaded_files_count} files
                </div>
                <div className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {formatBytes(previewData.cascaded_bytes)} destroyed
                </div>
              </div>
            </div>

            {/* Room Breakdown Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Room-by-Room Impact Breakdown ({previewData.rooms_breakdown?.length || 0})
              </div>

              <div style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px'
              }}>
                {previewData.rooms_breakdown && previewData.rooms_breakdown.length > 0 ? (
                  previewData.rooms_breakdown.map((room) => (
                    <div key={room.room_id} style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-medium)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          {room.room_name} <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>#{room.room_id}</span>
                        </div>
                        {room.room_deleted_as_sole_member ? (
                          <span className="action-chip destructive" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            Room will be deleted
                          </span>
                        ) : room.ownership_transferred_to ? (
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--emerald-bg-tint)',
                            color: 'var(--emerald-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Crown size={12} /> Crown Transfer
                          </span>
                        ) : null}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                        <span>Migratable: <strong className="font-mono" style={{ color: 'var(--emerald-primary)' }}>{room.migratable_count}</strong> ({formatBytes(room.migratable_bytes)})</span>
                        <span>Cascaded: <strong className="font-mono" style={{ color: 'var(--red-status)' }}>{room.cascaded_count}</strong> ({formatBytes(room.cascaded_bytes)})</span>
                      </div>

                      {room.ownership_transferred_to && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>New Owner:</span>
                          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{room.ownership_transferred_to}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    You are not hosting any files in any rooms.
                  </div>
                )}
              </div>
            </div>

            {/* Warning Callout */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: '0.8rem',
              color: 'var(--red-status)',
              lineHeight: 1.4
            }}>
              <strong>Warning:</strong> Account deletion is immediate and permanent. Google OAuth tokens will be revoked, your account record deleted, and non-migratable files physically erased from Google Drive.
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
              <button className="btn-slate" onClick={onClose} disabled={deleting}>
                Cancel & Keep Account
              </button>
              <button
                className="action-chip destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ padding: '8px 16px', fontSize: '0.88rem', borderRadius: '6px' }}
              >
                {deleting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Deleting Account & Executing Migrations...</span>
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trash2 size={16} />
                    <span>Confirm Account Deletion</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
