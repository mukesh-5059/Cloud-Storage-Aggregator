import React from 'react';
import { HardDrive, Plus, LogOut, User } from 'lucide-react';

export default function RoomRail({
  rooms,
  activeRoom,
  onSelectRoom,
  onOpenCreateJoinModal,
  currentUser,
  onOpenProfileModal
}) {
  return (
    <div className="room-rail">
      {/* App Logo / Personal Home Rail Icon */}
      <div className="tooltip-wrapper">
        <div 
          className={`rail-item ${!activeRoom ? 'active' : ''}`}
          onClick={() => onSelectRoom(null)}
        >
          <div className="rail-item-pill" />
          <HardDrive size={24} />
        </div>
        <div className="tooltip">Global Storage Overview</div>
      </div>

      <div className="rail-divider" />

      {/* Joined Rooms List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, width: '100%', alignItems: 'center', overflowY: 'auto', overflowX: 'hidden' }}>
        {rooms.map((room) => {
          const isActive = activeRoom && activeRoom.id === room.id;
          const initial = room.name ? room.name.charAt(0).toUpperCase() : 'R';
          return (
            <div key={room.id} className="tooltip-wrapper">
              <div
                className={`rail-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectRoom(room)}
              >
                <div className="rail-item-pill" />
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{initial}</span>
              </div>
              <div className="tooltip">{room.name}</div>
            </div>
          );
        })}

        {/* Add / Join Room Button */}
        <div className="tooltip-wrapper">
          <div className="rail-item" onClick={onOpenCreateJoinModal} style={{ color: 'var(--accent-emerald)' }}>
            <Plus size={24} />
          </div>
          <div className="tooltip">Create or Join a Room</div>
        </div>
      </div>

      <div className="rail-divider" />

      {/* User Profile Bottom Icon */}
      {currentUser && (
        <div className="tooltip-wrapper">
          <div 
            className="rail-item" 
            onClick={onOpenProfileModal} 
            style={{ 
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))', 
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '1rem'
            }}
          >
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="tooltip">Profile & Account ({currentUser.name})</div>
        </div>
      )}
    </div>
  );
}
