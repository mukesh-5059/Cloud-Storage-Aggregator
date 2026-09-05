import React, { useState, useRef } from 'react';
import { Crown, HardDrive, Mail, CheckCircle2, FileText, X } from 'lucide-react';

export default function MemberList({ members = [], activeRoom, currentUser }) {
  const [hoveredMember, setHoveredMember] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0 });
  const closeTimeoutRef = useRef(null);

  const defaultDummyMembers = [
    {
      id: 1,
      name: 'Mukesh',
      email: 'mukesh@example.com',
      storage_limit: 25 * 1024 * 1024 * 1024, // 25 GB
      files_count: 5,
      isOnline: true
    },
    {
      id: 2,
      name: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      storage_limit: 15 * 1024 * 1024 * 1024, // 15 GB
      files_count: 3,
      isOnline: true
    },
    {
      id: 3,
      name: 'Alex Rivera',
      email: 'alex.r@example.com',
      storage_limit: 20 * 1024 * 1024 * 1024, // 20 GB
      files_count: 4,
      isOnline: true
    },
    {
      id: 4,
      name: 'David Chen',
      email: 'david.c@example.com',
      storage_limit: 10 * 1024 * 1024 * 1024, // 10 GB
      files_count: 2,
      isOnline: false
    }
  ];

  const activeMembersList = (members && members.length > 0) ? members : defaultDummyMembers;

  const handleMouseEnterMember = (e, member) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({ top: rect.top });
    setHoveredMember(member);
  };

  const handleMouseLeaveMember = () => {
    // Delay closing slightly so user can move mouse onto the popover card
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredMember(null);
    }, 200);
  };

  const handleMouseEnterPopover = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  };

  const handleMouseLeavePopover = () => {
    setHoveredMember(null);
  };

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '15 GB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isOwner = (memberId) => {
    if (activeRoom && activeRoom.owner_id) return activeRoom.owner_id === memberId;
    return memberId === 1;
  };

  return (
    <aside className="member-sidebar" style={{ position: 'relative' }}>
      <div className="member-category-title">
        Room Members — {activeMembersList.length}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {activeMembersList.map((member) => {
          const ownerStatus = isOwner(member.id);
          const initial = member.name ? member.name.charAt(0).toUpperCase() : 'U';
          const isHovered = hoveredMember?.id === member.id;

          return (
            <div
              key={member.id}
              className="member-item"
              onMouseEnter={(e) => handleMouseEnterMember(e, member)}
              onMouseLeave={handleMouseLeaveMember}
              style={{
                border: isHovered ? '1px solid var(--border-glow)' : '1px solid transparent',
                backgroundColor: isHovered ? 'var(--bg-card-hover)' : 'transparent'
              }}
            >
              <div className="member-avatar-wrapper">
                <div className="member-avatar">{initial}</div>
                <div 
                  className="status-indicator" 
                  style={{
                    backgroundColor: member.isOnline !== false ? 'var(--accent-emerald)' : 'var(--text-muted)'
                  }}
                  title={member.isOnline !== false ? "Online — Google Drive Linked" : "Offline"} 
                />
              </div>

              <div className="member-info">
                <div className="member-name">
                  {member.name}
                  {member.id === currentUser?.id && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> (You)</span>}
                </div>
                <div className="member-role" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {ownerStatus && <Crown size={12} color="var(--accent-amber)" />}
                  <span>{ownerStatus ? 'Room Owner' : 'Contributor'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Discord Profile Popover (Cursor can move directly onto card) */}
      {hoveredMember && (
        <div 
          className="profile-card-popover" 
          style={{ 
            top: Math.min(popoverPos.top, window.innerHeight - 280)
          }}
          onMouseEnter={handleMouseEnterPopover}
          onMouseLeave={handleMouseLeavePopover}
        >
          <div className="profile-banner" />
          <div className="profile-avatar-large">
            {hoveredMember.name ? hoveredMember.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="profile-body">
            <div className="profile-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{hoveredMember.name}</span>
                {isOwner(hoveredMember.id) && (
                  <Crown size={16} color="var(--accent-amber)" title="Room Owner" />
                )}
              </div>
              <X 
                size={16} 
                color="var(--text-muted)" 
                style={{ cursor: 'pointer' }}
                onClick={() => setHoveredMember(null)}
              />
            </div>

            <div className="profile-email" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <Mail size={13} color="var(--accent-cyan)" />
              <span>{hoveredMember.email}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '2px' }}>
              <CheckCircle2 size={13} />
              <span>Google OAuth Verified</span>
            </div>

            {/* Storage Metric Stat Box */}
            <div className="profile-stat-box" style={{ background: 'var(--bg-rail)', borderRadius: '8px', padding: '10px 12px', marginTop: '6px' }}>
              <div className="profile-stat-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                CONTRIBUTED GDRIVE STORAGE
              </div>
              <div className="profile-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                <HardDrive size={16} />
                <span>{formatBytes(hoveredMember.storage_limit)}</span>
              </div>
            </div>

            {/* Files Hosted Metric */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <FileText size={14} color="var(--accent-indigo)" />
              <span>Hosts {hoveredMember.files_count || 3} Files in this Room</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
