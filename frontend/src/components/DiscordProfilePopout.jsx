import React from 'react';

export default function DiscordProfilePopout({
  member,
  top,
  onMouseEnter,
  onMouseLeave,
}) {
  if (!member) return null;

  return (
    <div
      className="discord-profile-popout"
      style={{ top: `${top}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="profile-banner" />
      <div className="profile-avatar-row">
        <div className="profile-avatar-large-container">
          {member.picture ? (
            <img src={member.picture} alt={member.name} className="profile-avatar-large-img" />
          ) : (
            <div className="avatar-fallback" style={{ width: '100%', height: '100%' }}>
              {member.name.substring(0, 1)}
            </div>
          )}
          <span className="profile-status-dot-large online" />
        </div>
      </div>

      <div className="profile-body">
        <div className="profile-name-container">
          <h4 className="profile-name">{member.name}</h4>
          {member.role === 'owner' ? (
            <span className="badge-owner">OWNER</span>
          ) : (
            <span className="badge-member">MEMBER</span>
          )}
        </div>
        <div className="profile-tag">{member.email}</div>

        <div className="profile-divider" />

        <div className="profile-section">
          <div className="profile-label">USER IDENTIFIER</div>
          <div className="profile-node-id">{member.user_id}</div>
        </div>

        <div className="profile-section">
          <div className="profile-label">STORAGE CONTRIBUTION</div>
          {member.contributed_storage_gb > 0 ? (
            <div className="profile-contrib-box">
              <div className="contrib-badge">Google Drive Storage Pool</div>
              <div className="contrib-row">
                <span>Allocated Quota:</span>
                <strong>{member.contributed_storage_gb} GB</strong>
              </div>
              <div className="contrib-row">
                <span>Vault Target:</span>
                <code>~/NodeVaultPool</code>
              </div>
            </div>
          ) : (
            <div className="profile-val-muted">non contributing member</div>
          )}
        </div>

        <div className="profile-section">
          <div className="profile-label">PROVIDER STATUS</div>
          <div className="profile-status-text online">
            Google Cloud Drive (Always Online)
          </div>
        </div>
      </div>
    </div>
  );
}
