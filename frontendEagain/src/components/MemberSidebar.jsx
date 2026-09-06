import React, { useState } from 'react';
import { Crown, HardDrive, FileText } from 'lucide-react';

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function MemberSidebar({ members, roomOwnerId, currentUserId }) {
  const [hoveredMemberId, setHoveredMemberId] = useState(null);

  return (
    <aside className="member-sidebar" aria-label="Room Members">
      <div className="sidebar-header">
        ROOM MEMBERS — {members ? members.length : 0}
      </div>

      <div className="member-list">
        {members && members.map((member) => {
          const isOwner = member.id === roomOwnerId;
          const isYou = member.id === currentUserId;
          const isHovered = hoveredMemberId === member.id;

          return (
            <div
              key={member.id}
              className="member-card"
              onMouseEnter={() => setHoveredMemberId(member.id)}
              onMouseLeave={() => setHoveredMemberId(null)}
            >
              <div className="member-info">
                <div className="member-name">
                  <span>{member.name}</span>
                  {isYou && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(You)</span>}
                  {isOwner && (
                    <span className="owner-badge">
                      <Crown size={12} /> Owner
                    </span>
                  )}
                </div>
                <div className="member-id-tag font-mono">
                  ID: #{member.id} • {formatBytes(member.allocated_bytes || 0)} Contributed
                </div>
              </div>

              {/* Interactive User Hover Popover Card */}
              {isHovered && (
                <div className="user-hover-card">
                  <div className="hover-card-header">
                    <div className="hover-card-name">{member.name}</div>
                    <div className="hover-card-email">{member.email}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--emerald-primary)', marginTop: '4px' }} className="font-mono">
                      User Main ID: #{member.id}
                    </div>
                  </div>

                  <div className="hover-card-stat">
                    <span>Contributed Quota:</span>
                    <span className="hover-card-stat-val font-mono">{formatBytes(member.allocated_bytes || 0)}</span>
                  </div>

                  <div className="hover-card-stat">
                    <span>Storage Used:</span>
                    <span className="hover-card-stat-val font-mono">{formatBytes(member.used_bytes || 0)}</span>
                  </div>

                  <div className="hover-card-stat">
                    <span>Files Hosted:</span>
                    <span className="hover-card-stat-val font-mono">{member.files_hosted_count || member.files_count || 0} files</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
