import logging
import json
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Room, UserRoom, FileItem
from schemas import (
    UserResponse,
    UserSelfResponse,
    AccountDeletionPreviewResponse,
    RoomDeletionPreview
)
from auth_utils import get_current_user
from routers.files import get_fresh_google_access_token

logger = logging.getLogger("users")
router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserSelfResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    logger.info(f"User ID {current_user.id} ({current_user.email}) accessed profile /users/me")
    return current_user


@router.get("/me/deletion-preview", response_model=AccountDeletionPreviewResponse)
def get_account_deletion_preview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Simulates multi-room bin-packing account deletion dry-run preview."""
    logger.info(f"User ID {current_user.id} ({current_user.email}) requested account deletion preview")

    user_memberships = db.query(UserRoom).filter(UserRoom.user_id == current_user.id).all()

    total_hosted_files = 0
    total_hosted_bytes = 0
    total_migratable_files = 0
    total_migratable_bytes = 0
    total_cascaded_files = 0
    total_cascaded_bytes = 0

    rooms_breakdown = []

    for membership in user_memberships:
        room = membership.room
        room_hosted_files = db.query(FileItem).filter(
            FileItem.room_id == room.id,
            FileItem.storage_user_id == current_user.id,
            FileItem.is_folder == False
        ).all()

        # Sort files largest-to-smallest for bin-packing simulation
        room_hosted_files.sort(key=lambda f: f.size_bytes, reverse=True)

        other_memberships = db.query(UserRoom).filter(
            UserRoom.room_id == room.id,
            UserRoom.user_id != current_user.id
        ).all()

        # Track virtual free capacities for simulation: { user_id: (allocated_bytes - used_bytes) }
        virtual_free_capacity = {
            m.user_id: max(0, m.allocated_bytes - m.used_bytes)
            for m in other_memberships
        }

        room_migratable_count = 0
        room_migratable_bytes = 0
        room_cascaded_count = 0
        room_cascaded_bytes = 0

        for file_item in room_hosted_files:
            file_size = file_item.size_bytes
            total_hosted_files += 1
            total_hosted_bytes += file_size

            sorted_candidates = sorted(
                virtual_free_capacity.items(),
                key=lambda item: item[1],
                reverse=True
            )

            target_user_id = None
            for uid, free_cap in sorted_candidates:
                if free_cap >= file_size:
                    target_user_id = uid
                    break

            if target_user_id:
                virtual_free_capacity[target_user_id] -= file_size
                room_migratable_count += 1
                room_migratable_bytes += file_size
            else:
                room_cascaded_count += 1
                room_cascaded_bytes += file_size

        total_migratable_files += room_migratable_count
        total_migratable_bytes += room_migratable_bytes
        total_cascaded_files += room_cascaded_count
        total_cascaded_bytes += room_cascaded_bytes

        ownership_transferred_to = None
        room_deleted = False

        if room.owner_id == current_user.id:
            if other_memberships:
                next_owner = other_memberships[0].user
                ownership_transferred_to = f"{next_owner.name} ({next_owner.email})"
            else:
                room_deleted = True

        rooms_breakdown.append(RoomDeletionPreview(
            room_id=room.id,
            room_name=room.name,
            migratable_count=room_migratable_count,
            migratable_bytes=room_migratable_bytes,
            cascaded_count=room_cascaded_count,
            cascaded_bytes=room_cascaded_bytes,
            ownership_transferred_to=ownership_transferred_to,
            room_deleted_as_sole_member=room_deleted
        ))

    return AccountDeletionPreviewResponse(
        total_hosted_files=total_hosted_files,
        total_hosted_bytes=total_hosted_bytes,
        migratable_files_count=total_migratable_files,
        migratable_bytes=total_migratable_bytes,
        cascaded_files_count=total_cascaded_files,
        cascaded_bytes=total_cascaded_bytes,
        rooms_breakdown=rooms_breakdown
    )


@router.delete("/me")
def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Executes real Google Drive API physical file streams, cascades, and user account deletion."""
    logger.info(f"Executing real account deletion for User ID {current_user.id} ({current_user.email})")

    # Retrieve fresh access token for current_user BEFORE token revocation
    user_access_token = get_fresh_google_access_token(current_user, db)

    user_memberships = db.query(UserRoom).filter(UserRoom.user_id == current_user.id).all()

    total_migrated = 0
    total_cascaded = 0

    for membership in user_memberships:
        room_id = membership.room_id

        hosted_files = db.query(FileItem).filter(
            FileItem.room_id == room_id,
            FileItem.storage_user_id == current_user.id,
            FileItem.is_folder == False
        ).all()
        hosted_files.sort(key=lambda f: f.size_bytes, reverse=True)

        other_memberships = db.query(UserRoom).filter(
            UserRoom.room_id == room_id,
            UserRoom.user_id != current_user.id
        ).all()

        for file_item in hosted_files:
            file_size = file_item.size_bytes

            other_memberships.sort(key=lambda m: (m.allocated_bytes - m.used_bytes), reverse=True)

            target_host = None
            for m in other_memberships:
                if (m.allocated_bytes - m.used_bytes) >= file_size:
                    target_host = m
                    break

            if target_host:
                target_user = db.query(User).filter(User.id == target_host.user_id).first()
                target_access_token = get_fresh_google_access_token(target_user, db) if target_user else None

                new_gdrive_id = None

                # Physical Google Drive Migration: Stream User A -> Upload User B -> Delete User A
                if user_access_token and target_access_token and target_user and file_item.gdrive_file_id:
                    try:
                        download_url = f"https://www.googleapis.com/drive/v3/files/{file_item.gdrive_file_id}?alt=media"
                        dl_res = requests.get(download_url, headers={"Authorization": f"Bearer {user_access_token}"}, stream=True)

                        if dl_res.status_code == 200:
                            metadata = {
                                "name": file_item.name,
                                "mimeType": file_item.mime_type or "application/octet-stream"
                            }
                            if target_host.gdrive_folder_id:
                                metadata["parents"] = [target_host.gdrive_folder_id]

                            files_payload = {
                                "data": ("metadata", json.dumps(metadata), "application/json; charset=UTF-8"),
                                "file": (file_item.name, dl_res.content, file_item.mime_type or "application/octet-stream")
                            }
                            up_res = requests.post(
                                "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
                                headers={"Authorization": f"Bearer {target_access_token}"},
                                files=files_payload
                            )

                            if up_res.status_code == 200:
                                new_gdrive_id = up_res.json().get("id")
                                perm_url = f"https://www.googleapis.com/drive/v3/files/{new_gdrive_id}/permissions"
                                requests.post(
                                    perm_url,
                                    headers={"Authorization": f"Bearer {target_access_token}", "Content-Type": "application/json"},
                                    data=json.dumps({"role": "reader", "type": "anyone"})
                                )

                                del_url = f"https://www.googleapis.com/drive/v3/files/{file_item.gdrive_file_id}"
                                requests.delete(del_url, headers={"Authorization": f"Bearer {user_access_token}"})
                                logger.info(f"Physically migrated file '{file_item.name}' from User {current_user.id} GDrive to User {target_user.id} GDrive ({new_gdrive_id})")
                    except Exception as e:
                        logger.error(f"Failed physical Drive migration for file {file_item.id}: {e}")

                target_host.used_bytes += file_size
                target_host.files_hosted_count += 1
                file_item.storage_user_id = target_host.user_id
                if new_gdrive_id:
                    file_item.gdrive_file_id = new_gdrive_id
                total_migrated += 1
            else:
                # Cascade Delete: Delete from User A's Google Drive & delete row from SQLite DB
                if user_access_token and file_item.gdrive_file_id:
                    try:
                        del_url = f"https://www.googleapis.com/drive/v3/files/{file_item.gdrive_file_id}"
                        requests.delete(del_url, headers={"Authorization": f"Bearer {user_access_token}"})
                        logger.info(f"Physically deleted cascaded file '{file_item.name}' ({file_item.gdrive_file_id}) from User {current_user.id}'s GDrive")
                    except Exception as e:
                        logger.warning(f"Could not delete cascaded file from Drive: {e}")

                db.delete(file_item)
                total_cascaded += 1

        # Delete room contribution folder from deleting user's Google Drive
        if user_access_token and membership.gdrive_folder_id:
            try:
                folder_del_url = f"https://www.googleapis.com/drive/v3/files/{membership.gdrive_folder_id}"
                requests.delete(folder_del_url, headers={"Authorization": f"Bearer {user_access_token}"})
                logger.info(f"Deleted room contribution folder '{membership.gdrive_folder_id}' from User ID {current_user.id}'s Google Drive")
            except Exception as e:
                logger.warning(f"Could not delete contribution folder {membership.gdrive_folder_id} from Drive: {e}")

    # Revoke OAuth Token
    token_to_revoke = current_user.google_access_token or current_user.google_refresh_token
    if token_to_revoke:
        try:
            revoke_url = f"https://oauth2.googleapis.com/revoke?token={token_to_revoke}"
            requests.post(revoke_url, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=5)
            logger.info(f"Revoked Google token for User ID {current_user.id}")
        except Exception as e:
            logger.warning(f"Could not revoke Google token: {e}")

    # Transfer room ownership or collect empty rooms to delete
    rooms_to_delete = []
    owned_rooms = db.query(Room).filter(Room.owner_id == current_user.id).all()
    for room in owned_rooms:
        remaining_memberships = [m for m in room.user_memberships if m.user_id != current_user.id]
        if remaining_memberships:
            next_owner_id = remaining_memberships[0].user_id
            room.owner_id = next_owner_id
            logger.info(f"Transferred ownership of Room ID {room.id} ('{room.name}') to User ID {next_owner_id}")
        else:
            logger.info(f"Killed Room ID {room.id} ('{room.name}') as User ID {current_user.id} was sole member")
            rooms_to_delete.append(room)

    # Delete empty rooms
    for r in rooms_to_delete:
        db.delete(r)

    # Delete user record (cascade rules will clean up UserRoom rows automatically)
    db.delete(current_user)
    db.commit()

    logger.info(f"Successfully deleted User ID {current_user.id} (Migrated {total_migrated} files, Cascaded {total_cascaded} files)")
    return {
        "message": "Account successfully deleted",
        "migrated_files_count": total_migrated,
        "cascaded_files_count": total_cascaded
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
