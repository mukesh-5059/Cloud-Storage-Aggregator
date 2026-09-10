import React from 'react';
import { Shield, Copy, Check } from 'lucide-react';

export default function RoomHeader({
  activeRoom,
  onCopyRoomCode,
  copiedCode
}) {
  return (
    <header className="room-header">
      {/* Left: Room Title & Room Code */}
      <div className="header-title-section">
        <h1 className="header-room-name">
          <Shield size={20} color="var(--accent-cyan)" />
          {activeRoom ? activeRoom.name : 'Global Cloud Storage'}
        </h1>

        {activeRoom && (
          <div 
            className="header-room-code" 
            onClick={() => onCopyRoomCode(activeRoom.id)}
            title="Click to copy Room Code"
          >
            {copiedCode ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
            <span>ID: #{activeRoom.id}</span>
          </div>
        )}
      </div>

      {/* Right: Room Context Info */}
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
        Collaborative GDrive Storage Room
      </div>
    </header>
  );
}
