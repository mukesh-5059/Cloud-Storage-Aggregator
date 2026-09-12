import React, { useState } from 'react';
import { Crown, HardDrive, FileText, X } from 'lucide-react';
import { formatBytes } from '../utils/formatters';

export default function MemberSidebar({ members, roomOwnerId, currentUserId, isMobileOpen, onCloseMobile }) {
  const [expandedMemberId, setExpandedMemberId] = useState(null);

  return (
    <>
      {isMobileOpen && (
        <div className="member-sidebar-backdrop" onClick={onCloseMobile} aria-hidden="true" />
      )}
      <aside className={`member-sidebar ${isMobileOpen ? 'mobile-open' : ''}`} aria-label="Room Members">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>ROOM MEMBERS — {members ? members.length : 0}</span>
          {onCloseMobile && (
            <button className="close-btn mobile-sidebar-close" onClick={onCloseMobile} aria-label="Close members panel">
              <X size={18} />
            </button>
          )}
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
              onClick={() => setExpandedMemberId(prev => prev === member.id ? null : member.id)}
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
                <div className="member-details-drawer">
                  <div className="member-detail-row">
                    <span className="member-detail-label">Email:</span>
                    <span className="member-detail-val">{member.email}</span>
                  </div>

                  <div className="member-detail-row">
                    <span className="member-detail-label">Main User ID:</span>
                    <span className="font-mono" style={{ color: 'var(--emerald-primary)' }}>#{member.id}</span>
                  </div>

                  <div className="member-detail-row">
                    <span className="member-detail-label">Storage Allocated:</span>
                    <span className="font-mono" style={{ color: 'var(--emerald-primary)' }}>{formatBytes(member.allocated_bytes || 0)}</span>
                  </div>

                  <div className="member-detail-row">
                    <span className="member-detail-label">Storage Used:</span>
                    <span className="font-mono" style={{ color: 'var(--amber-status)' }}>{formatBytes(member.used_bytes || 0)}</span>
                  </div>

                  <div className="member-detail-row">
                    <span className="member-detail-label">Files Hosted:</span>
                    <span className="font-mono" style={{ color: 'var(--text-main)' }}>{member.files_hosted_count || 0} files</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
    </>
  );
}
