import React from 'react';
import { HardDrive, Plus, User as UserIcon } from 'lucide-react';

export default function NavigationRail({ rooms, loading, activeRoomId, onSelectRoom, onOpenCreateJoinModal, onOpenProfileModal, currentUser }) {
  return (
    <nav className="nav-rail" aria-label="Room Navigation">
      <div className="rail-room-list">
        <div className="rail-brand-logo" title="RoomVault Cloud Storage">
          <HardDrive size={22} />
        </div>

        {loading ? (
          [1, 2, 3].map((idx) => (
            <div key={idx} className="rail-item skeleton-box" style={{ width: '44px', height: '44px', borderRadius: '12px' }} />
          ))
        ) : rooms && rooms.map((room) => {
          const isActive = room.id === activeRoomId;
          const initial = room.name ? room.name.charAt(0).toUpperCase() : 'R';
          return (
            <button
              key={room.id}
              className={`rail-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectRoom(room.id)}
              title={`${room.name} (ID: #${room.id})`}
            >
              <span>{initial}</span>
            </button>
          );
        })}

        <button
          className="rail-action-btn"
          onClick={onOpenCreateJoinModal}
          title="Create or Join Room"
        >
          <Plus size={20} />
        </button>
      </div>

      <button
        className="rail-profile-btn"
        onClick={onOpenProfileModal}
        title={`My Profile: ${currentUser?.name || 'User'} (ID: #${currentUser?.id || ''})`}
      >
        <UserIcon size={18} />
      </button>
    </nav>
  );
}
