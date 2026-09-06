import logging
import json
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, Room, UserRoom, FileItem
from schemas import RoomCreate, RoomJoin, RoomResponse, UserResponse, StorageContributeRequest, ContributionResponse
from auth_utils import get_current_user
from routers.files import get_fresh_google_access_token

logger = logging.getLogger("rooms")
router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.post("", response_model=RoomResponse)
def create_room(
    payload: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} ({current_user.email}) creating room '{payload.name}'")
    room = Room(
        name=payload.name,
        password=payload.password,
        owner_id=current_user.id
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    # Add owner as first member in user_rooms
    user_room = UserRoom(
        user_id=current_user.id,
        room_id=room.id,
        allocated_bytes=0,
        used_bytes=0
    )
    db.add(user_room)
    db.commit()

    logger.info(f"Created Room ID {room.id} ('{room.name}') owned by User ID {current_user.id}")
    return room

@router.post("/{room_id}/join")
def join_room(
    room_id: int,
    payload: RoomJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} attempting to join Room ID {room_id}")
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        logger.warning(f"Join failed: Room ID {room_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    if room.password != payload.password:
        logger.warning(f"SECURITY ALERT: User ID {current_user.id} failed password check for Room ID {room_id}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid room password")

    existing_membership = db.query(UserRoom).filter(
        UserRoom.user_id == current_user.id,
        UserRoom.room_id == room_id
    ).first()

    if existing_membership:
        logger.info(f"User ID {current_user.id} is already a member of Room ID {room_id}")
        return {"message": "User is already a member of this room"}

    membership = UserRoom(
        user_id=current_user.id,
        room_id=room_id,
        allocated_bytes=0,
        used_bytes=0
    )
    db.add(membership)
    db.commit()
    logger.info(f"User ID {current_user.id} successfully joined Room ID {room_id}")
    return {"message": "Successfully joined room"}

@router.get("", response_model=List[RoomResponse])
def get_my_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(UserRoom).filter(UserRoom.user_id == current_user.id).all()
    rooms = [m.room for m in memberships]
    logger.info(f"User ID {current_user.id} fetching joined rooms list ({len(rooms)} rooms found)")
    return rooms

@router.get("/{room_id}/users", response_model=List[UserResponse])
def get_room_users(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} requesting members list for Room ID {room_id}")
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        logger.warning(f"Fetch members failed: Room ID {room_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    membership = db.query(UserRoom).filter(
        UserRoom.user_id == current_user.id,
        UserRoom.room_id == room_id
    ).first()

    if not membership:
        logger.warning(f"SECURITY ALERT: User ID {current_user.id} attempted to view members of Room ID {room_id} without membership (403)")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not a member of this room"
        )

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

    logger.info(f"Retrieved {len(members_data)} members for Room ID {room_id}")
    return members_data

@router.post("/{room_id}/contribute", response_model=ContributionResponse)
def contribute_storage(
    room_id: int,
    payload: StorageContributeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} allocating {payload.allocated_bytes} bytes to Room ID {room_id}")
    membership = db.query(UserRoom).filter(
        UserRoom.user_id == current_user.id,
        UserRoom.room_id == room_id
    ).first()

    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Not a room member")

    # Unique GDrive folder naming strategy for room contribution: CloudAggregator_Room_{room_id}_User_{user_id}
    gdrive_folder_name = f"CloudAggregator_Room_{room_id}_User_{current_user.id}"

    membership.allocated_bytes = payload.allocated_bytes

    # Create physical folder in Google Drive if real ID is not yet stored
    if not membership.gdrive_folder_id or membership.gdrive_folder_id.startswith("CloudAggregator_") or membership.gdrive_folder_id.startswith("mock_"):
        access_token = get_fresh_google_access_token(current_user, db)
        folder_id = f"mock_folder_{room_id}_{current_user.id}"

        if access_token and not access_token.startswith("mock_"):
            try:
                folder_metadata = {
                    "name": gdrive_folder_name,
                    "mimeType": "application/vnd.google-apps.folder"
                }
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                gdrive_res = requests.post(
                    "https://www.googleapis.com/drive/v3/files",
                    headers=headers,
                    data=json.dumps(folder_metadata)
                )

                if gdrive_res.status_code == 200:
                    folder_id = gdrive_res.json().get("id", folder_id)
                    logger.info(f"Created real Google Drive folder '{gdrive_folder_name}' with ID {folder_id}")
                else:
                    logger.warning(f"Google Drive folder creation status {gdrive_res.status_code}: {gdrive_res.text}")
            except Exception as e:
                logger.error(f"Error creating Google Drive folder: {e}")

        membership.gdrive_folder_id = folder_id

    db.commit()
    db.refresh(membership)
    logger.info(f"Storage allocation updated for User ID {current_user.id} in Room ID {room_id}: {membership.allocated_bytes} bytes (GDrive Folder ID: {membership.gdrive_folder_id})")
    return membership

@router.get("/{room_id}/dashboard")
def get_room_dashboard(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = db.query(UserRoom).filter(
        UserRoom.user_id == current_user.id,
        UserRoom.room_id == room_id
    ).first()

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

    root_files_data = []
    for item in root_files:
        root_files_data.append({
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
        })

    logger.info(f"Retrieved consolidated Dashboard for Room ID {room_id} (User ID {current_user.id})")
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
