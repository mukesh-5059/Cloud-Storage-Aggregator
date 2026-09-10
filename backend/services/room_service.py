import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models import User, Room, UserRoom, FileItem
from services import gdrive_service

logger = logging.getLogger("room_service")

def create_room(db: Session, name: str, password: str, owner_id: int) -> Room:
    room = Room(name=name, password=password, owner_id=owner_id)
    db.add(room)
    db.commit()
    db.refresh(room)

    user_room = UserRoom(user_id=owner_id, room_id=room.id, allocated_bytes=0, used_bytes=0)
    db.add(user_room)
    db.commit()
    return room

def join_room(db: Session, room_id: int, user_id: int, password: str) -> Dict[str, str]:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    if room.password != password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid room password")

    existing_membership = db.query(UserRoom).filter(
        UserRoom.user_id == user_id,
        UserRoom.room_id == room_id
    ).first()

    if existing_membership:
        return {"message": "User is already a member of this room"}

    membership = UserRoom(user_id=user_id, room_id=room_id, allocated_bytes=0, used_bytes=0)
    db.add(membership)
    db.commit()
    return {"message": "Successfully joined room"}

def get_user_rooms(db: Session, user_id: int) -> List[Room]:
    memberships = db.query(UserRoom).filter(UserRoom.user_id == user_id).all()
    return [m.room for m in memberships]

def get_room_members(db: Session, room_id: int, user_id: int) -> List[Dict[str, Any]]:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    membership = db.query(UserRoom).filter(UserRoom.user_id == user_id, UserRoom.room_id == room_id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not a member of this room")

    members_data = []
    for m in room.user_memberships:
        files_count = db.query(FileItem).filter(
            FileItem.room_id == room_id,
            FileItem.storage_user_id == m.user_id,
            FileItem.is_folder == False
        ).count()
        members_data.append({
            "id": m.user.id,
            "email": m.user.email,
            "name": m.user.name,
            "storage_limit": m.user.storage_limit,
            "storage_usage": m.user.storage_usage,
            "allocated_bytes": m.allocated_bytes,
            "files_count": files_count
        })
    return members_data

async def contribute_storage(db: Session, room_id: int, current_user: User, allocated_bytes: int) -> UserRoom:
    membership = db.query(UserRoom).filter(
        UserRoom.user_id == current_user.id,
        UserRoom.room_id == room_id
    ).first()

    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Not a room member")

    gdrive_folder_name = f"CloudAggregator_Room_{room_id}_User_{current_user.id}"
    membership.allocated_bytes = allocated_bytes

    if not membership.gdrive_folder_id:
        access_token = await gdrive_service.get_fresh_google_access_token(current_user, db)
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has no active Google OAuth authorization to create storage folder."
            )
        try:
            folder_id = await gdrive_service.create_room_folder(access_token, gdrive_folder_name)
            membership.gdrive_folder_id = folder_id
        except Exception as e:
            logger.error(f"Error creating Google Drive folder: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Google Drive error: {str(e)}")

    db.commit()
    db.refresh(membership)
    return membership

def get_room_dashboard(db: Session, room_id: int, user_id: int) -> Dict[str, Any]:
    membership = db.query(UserRoom).filter(UserRoom.user_id == user_id, UserRoom.room_id == room_id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not a member of this room")

    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    total_allocated = sum(m.allocated_bytes for m in room.user_memberships)
    total_used = sum(m.used_bytes for m in room.user_memberships)

    members_list = [
        {
            "id": m.user.id,
            "email": m.user.email,
            "name": m.user.name,
            "storage_limit": m.user.storage_limit,
            "storage_usage": m.user.storage_usage,
            "allocated_bytes": m.allocated_bytes,
            "used_bytes": m.used_bytes,
            "files_hosted_count": m.files_hosted_count
        }
        for m in room.user_memberships
    ]

    root_files = db.query(FileItem).filter(
        FileItem.room_id == room_id,
        FileItem.parent_id.is_(None)
    ).all()

    root_files_data = [
        {
            "id": item.id,
            "room_id": item.room_id,
            "parent_id": item.parent_id,
            "name": item.name,
            "is_folder": item.is_folder,
            "size_bytes": item.size_bytes,
            "mime_type": item.mime_type,
            "uploader_id": item.uploader_id,
            "storage_user_id": item.storage_user_id,
            "uploader_name": item.uploader.name if item.uploader else "Unknown",
            "host_name": item.storage_user.name if item.storage_user else "Unknown",
            "gdrive_file_id": item.gdrive_file_id,
            "created_at": item.created_at
        }
        for item in root_files
    ]

    return {
        "room": {
            "id": room.id,
            "name": room.name,
            "owner_id": room.owner_id
        },
        "storage": {
            "total_allocated_bytes": total_allocated,
            "total_used_bytes": total_used
        },
        "members": members_list,
        "root_files": root_files_data
    }
