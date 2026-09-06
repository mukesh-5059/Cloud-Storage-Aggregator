import logging
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Room, UserRoom, FileItem
from schemas import UserResponse, UserSelfResponse
from auth_utils import get_current_user

logger = logging.getLogger("users")
router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserSelfResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    logger.info(f"User ID {current_user.id} ({current_user.email}) accessed profile /users/me")
    return current_user

@router.delete("/me")
def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} ({current_user.email}) requested account deletion")

    # 1. Handle auto-migration / cascade deletion of files hosted on current_user's storage
    hosted_files = db.query(FileItem).filter(
        FileItem.storage_user_id == current_user.id,
        FileItem.is_folder == False
    ).all()

    migrated_count = 0
    cascaded_count = 0

    for file_item in hosted_files:
        # Find eligible remaining room contributor (excluding current_user) with available quota
        eligible_memberships = db.query(UserRoom).filter(
            UserRoom.room_id == file_item.room_id,
            UserRoom.user_id != current_user.id
        ).all()

        # Sort contributors by highest available free capacity
        eligible_memberships.sort(
            key=lambda m: (m.allocated_bytes - m.used_bytes),
            reverse=True
        )

        target_host = None
        for m in eligible_memberships:
            if (m.allocated_bytes - m.used_bytes) >= file_item.size_bytes:
                target_host = m
                break

        if target_host:
            # Re-host file on target_host
            target_host.used_bytes += file_item.size_bytes
            file_item.storage_user_id = target_host.user_id
            file_item.gdrive_file_id = f"gdrive_file_{file_item.room_id}_{target_host.user_id}_{file_item.name}"
            migrated_count += 1
            logger.info(f"Auto-migrated file '{file_item.name}' (ID {file_item.id}) to User ID {target_host.user_id}")
        else:
            # No space available: cascade delete file
            db.delete(file_item)
            cascaded_count += 1
            logger.warning(f"Cascade deleted file '{file_item.name}' (ID {file_item.id}) due to insufficient room capacity")

    # 2. Revoke Google OAuth token if present
    token_to_revoke = current_user.google_access_token or current_user.google_refresh_token
    if token_to_revoke:
        try:
            revoke_url = f"https://oauth2.googleapis.com/revoke?token={token_to_revoke}"
            requests.post(revoke_url, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=5)
            logger.info(f"Revoked Google token for User ID {current_user.id} prior to account deletion")
        except Exception as e:
            logger.warning(f"Could not revoke Google token during account deletion: {e}")

    # 3. Handle room ownership transfers and room cleanup
    owned_rooms = db.query(Room).filter(Room.owner_id == current_user.id).all()
    for room in owned_rooms:
        remaining_memberships = [m for m in room.user_memberships if m.user_id != current_user.id]
        if remaining_memberships:
            next_owner_id = remaining_memberships[0].user_id
            room.owner_id = next_owner_id
            logger.info(f"Transferred ownership of Room ID {room.id} ('{room.name}') to User ID {next_owner_id}")
        else:
            logger.info(f"Killed Room ID {room.id} ('{room.name}') as User ID {current_user.id} was sole member")
            db.delete(room)

    # 4. Clean up room memberships
    db.query(UserRoom).filter(UserRoom.user_id == current_user.id).delete()

    # 5. Flush and delete user record
    db.flush()
    db.delete(current_user)
    db.commit()

    logger.info(f"Successfully deleted User ID {current_user.id} (Migrated {migrated_count} files, Cascaded {cascaded_count} files)")
    return {
        "message": "Account successfully deleted",
        "migrated_files_count": migrated_count,
        "cascaded_files_count": cascaded_count
    }

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} querying target User ID {user_id}")
    if user_id == current_user.id:
        return current_user

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        logger.warning(f"Target User ID {user_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    my_room_ids = {m.room_id for m in current_user.room_memberships}
    target_room_ids = {m.room_id for m in target_user.room_memberships}

    shared_rooms = my_room_ids.intersection(target_room_ids)
    if not shared_rooms:
        logger.warning(f"SECURITY ALERT: User ID {current_user.id} attempted to view User ID {user_id} without sharing a room (403)")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not share a room with this user"
        )

    logger.info(f"User ID {current_user.id} authorized to view User ID {user_id} (Shared Room IDs: {list(shared_rooms)})")
    return target_user
