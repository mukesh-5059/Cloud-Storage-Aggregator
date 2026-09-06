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
  const [expandedMemberId, setExpandedMemberId] = useState(null);

  return (
    <aside className="member-sidebar" aria-label="Room Members">
      <div className="sidebar-header">
        ROOM MEMBERS — {members ? members.length : 0}
      </div>

      <div className="member-list">
        {members && members.map((member) => {
          const isOwner = member.id === roomOwnerId;
          const isYou = member.id === currentUserId;
          const isExpanded = expandedMemberId === member.id;

          return (
            <div
              key={member.id}
              className={`member-card ${isExpanded ? 'expanded' : ''}`}
              onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
              onMouseEnter={() => setExpandedMemberId(member.id)}
              onMouseLeave={() => setExpandedMemberId(null)}
              style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              </div>

              {/* Expanded Inline Member Profile Details */}
              {isExpanded && (
                <div style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{member.email}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Main User ID:</span>
                    <span className="font-mono" style={{ color: 'var(--emerald-primary)' }}>#{member.id}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Storage Allocated:</span>
                    <span className="font-mono" style={{ color: 'var(--emerald-primary)' }}>{formatBytes(member.allocated_bytes || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Storage Used:</span>
                    <span className="font-mono" style={{ color: 'var(--amber-status)' }}>{formatBytes(member.used_bytes || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Files Hosted:</span>
                    <span className="font-mono" style={{ color: 'var(--text-main)' }}>{member.files_hosted_count || 0} files</span>
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
