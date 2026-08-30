import React from 'react';
import { HardDriveUpload } from 'lucide-react';

export default function RightMembersPanel({
  user,
  activeRoomDetails,
  onOpenContributeModal,
  onMemberMouseEnter,
  onMemberMouseLeave,
}) {
  const currentUserMember = activeRoomDetails?.members?.find(
    (m) => m.user_id === user?.id || m.email === user?.email
  );

  const myQuota = currentUserMember?.contributed_storage_gb || 0;
  const totalPool = activeRoomDetails?.total_allocated_gb || 0;

  return (
    <div className="right-members-panel">
      {activeRoomDetails ? (
        <>
          {/* Storage Pool Widget */}
          <div className="pool-widget-right">
            <div className="pool-header">
              <span>Your Contribution</span>
              <strong style={{ color: myQuota > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {myQuota} GB
              </strong>
            </div>

            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${
                    totalPool > 0 ? Math.min(100, (myQuota / totalPool) * 100) : 0
                  }%`,
                }}
              />
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Total Room Pool:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{totalPool} GB</strong>
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
                    {m.contributed_storage_gb || 0} GB
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
