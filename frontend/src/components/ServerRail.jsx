import React from 'react';
import { HardDrive, Plus, Link as LinkIcon } from 'lucide-react';

export default function ServerRail({
  user,
  rooms,
  activeRoomId,
  onSelectRoom,
  onOpenCreateModal,
  onOpenJoinModal,
  onOpenSignOutModal,
}) {
  return (
    <div className="server-rail">
      <div className="rail-icon active" title="RoomVault Home">
        <HardDrive size={22} />
      </div>

      <div className="rail-divider" />

      {/* Room Icons */}
      {rooms.map((rm) => (
        <div
          key={rm.room_id}
          className={`rail-icon ${rm.room_id === activeRoomId ? 'active' : ''}`}
          onClick={() => onSelectRoom(rm.room_id)}
          title={rm.name}
        >
          {rm.name.substring(0, 2).toUpperCase()}
        </div>
      ))}

      {/* Create Room Button */}
      <div
        className="rail-icon"
        style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--accent-green)' }}
        onClick={onOpenCreateModal}
        title="Create New Room"
      >
        <Plus size={22} />
      </div>

      {/* Join Room Button */}
      <div
        className="rail-icon"
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}
        onClick={onOpenJoinModal}
        title="Join Existing Room"
      >
        <LinkIcon size={20} />
      </div>

      {/* Bottom Profile Avatar Trigger -> Opens Sign Out Confirmation Dialog */}
      <div className="rail-bottom">
        <div
          className="rail-icon"
          onClick={onOpenSignOutModal}
          title={`Logged in as ${user?.name}. Click for Sign Out.`}
        >
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              style={{ width: '100%', height: '100%', borderRadius: '50%' }}
            />
          ) : (
            user?.name?.substring(0, 1) || 'U'
          )}
        </div>
      </div>
    </div>
  );
}
