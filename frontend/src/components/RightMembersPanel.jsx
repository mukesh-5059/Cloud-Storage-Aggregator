import React from 'react';
import { HardDriveUpload } from 'lucide-react';

export default function RightMembersPanel({
  activeRoomDetails,
  onOpenContributeModal,
  onMemberMouseEnter,
  onMemberMouseLeave,
}) {
  return (
    <div className="right-members-panel">
      {activeRoomDetails ? (
        <>
          {/* Storage Pool Card (Top of Right Panel) */}
          <div className="pool-widget-right">
            <div className="pool-header">
              <span>Shared Pool</span>
              <strong>{activeRoomDetails.total_allocated_gb || 0} GB Allocated</strong>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(
                    100,
                    ((activeRoomDetails.total_allocated_gb || 0) / 50) * 100
                  )}%`,
                }}
              />
            </div>
            <button className="btn-contribute" onClick={onOpenContributeModal}>
              <HardDriveUpload size={15} /> Contribute Storage
            </button>
          </div>

          {/* Members Section */}
          <div className="members-section-container">
            <div className="panel-section-title">
              Members — {activeRoomDetails.members?.length || 0}
            </div>

            {activeRoomDetails.members?.map((m) => (
              <div
                key={m.user_id}
                className="member-row-item"
                onMouseEnter={(e) => onMemberMouseEnter(e, m)}
                onMouseLeave={onMemberMouseLeave}
                onClick={(e) => onMemberMouseEnter(e, m)}
              >
                <div className="member-avatar-box">
                  {m.picture ? (
                    <img src={m.picture} alt={m.name} className="avatar-circle" />
                  ) : (
                    <div className="avatar-fallback">{m.name.substring(0, 1)}</div>
                  )}
                  <div className="online-dot" />
                </div>

                <div className="member-text-box">
                  <div className="member-display-name">
                    <span>{m.name}</span>
                    {m.role === 'owner' ? (
                      <span className="badge-owner">OWNER</span>
                    ) : (
                      <span className="badge-member">MEMBER</span>
                    )}
                  </div>
                  <div className="member-subtext">
                    {m.contributed_storage_gb > 0
                      ? `${m.contributed_storage_gb} GB Pooled`
                      : 'Viewer (0 GB)'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          No room selected.
        </div>
      )}
    </div>
  );
}
