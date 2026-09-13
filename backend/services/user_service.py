import logging
import asyncio
from collections import defaultdict
from typing import Dict, Any, List
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from models import User, Room, UserRoom, FileItem
from schemas import AccountDeletionPreviewResponse, RoomDeletionPreview
from services import gdrive_service

logger = logging.getLogger("user_service")

def simulate_deletion_bin_packing(db: Session, current_user: User) -> AccountDeletionPreviewResponse:
    """Simulates multi-room bin-packing account deletion preview with batched queries."""
    user_memberships = db.query(UserRoom).options(
        joinedload(UserRoom.room)
    ).filter(UserRoom.user_id == current_user.id).all()

    if not user_memberships:
        return AccountDeletionPreviewResponse(
            total_hosted_files=0,
            total_hosted_bytes=0,
            migratable_files_count=0,
            migratable_bytes=0,
            cascaded_files_count=0,
            cascaded_bytes=0,
            rooms_breakdown=[]
        )

    room_ids = [m.room_id for m in user_memberships]

    # Batch query 1: Fetch all hosted files for current_user across all relevant rooms
    all_hosted_files = db.query(FileItem).filter(
        FileItem.room_id.in_(room_ids),
        FileItem.storage_user_id == current_user.id,
        FileItem.is_folder == False
    ).all()

    files_by_room = defaultdict(list)
    for f in all_hosted_files:
        files_by_room[f.room_id].append(f)

    # Batch query 2: Fetch all other memberships across all relevant rooms
    all_other_memberships = db.query(UserRoom).options(
        joinedload(UserRoom.user)
    ).filter(
        UserRoom.room_id.in_(room_ids),
        UserRoom.user_id != current_user.id
    ).all()

    others_by_room = defaultdict(list)
    for m in all_other_memberships:
        others_by_room[m.room_id].append(m)

    total_hosted_files = 0
    total_hosted_bytes = 0
    total_migratable_files = 0
    total_migratable_bytes = 0
    total_cascaded_files = 0
    total_cascaded_bytes = 0

    rooms_breakdown: List[RoomDeletionPreview] = []

    for membership in user_memberships:
        room = membership.room
        if not room:
            continue

        room_hosted_files = files_by_room[room.id]
        room_hosted_files.sort(key=lambda f: f.size_bytes, reverse=True)

        other_memberships = others_by_room[room.id]

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

async def execute_account_deletion(db: Session, current_user: User) -> Dict[str, Any]:
    """Executes real Google Drive API physical file streams, cascades, and user account deletion."""
    user_access_token = await gdrive_service.get_fresh_google_access_token(current_user, db)
    user_memberships = db.query(UserRoom).filter(UserRoom.user_id == current_user.id).all()

    total_migrated = 0
    total_cascaded = 0
    semaphore = asyncio.Semaphore(4)

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

        other_user_ids = {m.user_id for m in other_memberships}
        target_users = {u.id: u for u in db.query(User).filter(User.id.in_(other_user_ids)).all()}
        target_tokens = {}
        for tu_id, tu in target_users.items():
            tok = await gdrive_service.get_fresh_google_access_token(tu, db)
            if tok:
                target_tokens[tu_id] = tok

        migration_tasks = []

        for file_item in hosted_files:
            file_size = file_item.size_bytes
            other_memberships.sort(key=lambda m: (m.allocated_bytes - m.used_bytes), reverse=True)

            target_host = None
            for m in other_memberships:
                if (m.allocated_bytes - m.used_bytes) >= file_size and m.user_id in target_tokens:
                    target_host = m
                    break

            if target_host:
                target_host.used_bytes += file_size
                target_host.files_hosted_count += 1
                t_token = target_tokens[target_host.user_id]
                t_folder_id = target_host.gdrive_folder_id

                async def process_single_migration(item: FileItem, target_uid: int, target_token: str, target_folder_id: Optional[str]):
                    async with semaphore:
                        metadata = {
                            "name": item.name,
                            "mimeType": item.mime_type or "application/octet-stream"
                        }
                        if target_folder_id:
                            metadata["parents"] = [target_folder_id]

                        content = await gdrive_service.download_file_content(
                            user_access_token, item.gdrive_file_id
                        )
                        if not content:
                            raise RuntimeError(f"Failed to download file '{item.name}' from User {current_user.id}'s Drive.")

                        new_gdrive_id = await gdrive_service.upload_file_multipart(
                            target_token, metadata, item.name, content, item.mime_type or "application/octet-stream"
                        )
                        if not new_gdrive_id:
                            raise RuntimeError(f"Failed to upload file '{item.name}' to User {target_uid}'s Drive.")

                        await gdrive_service.set_file_permission(target_token, new_gdrive_id)
                        await gdrive_service.delete_file(user_access_token, item.gdrive_file_id)

                        logger.info(f"Server-proxied file '{item.name}' ({len(content)} bytes) from User {current_user.id} to User {target_uid} (New Drive ID: {new_gdrive_id})")

                        return item, target_uid, new_gdrive_id

                migration_tasks.append(process_single_migration(file_item, target_host.user_id, t_token, t_folder_id))
                total_migrated += 1
            else:
                if user_access_token and file_item.gdrive_file_id:
                    try:
                        await gdrive_service.delete_file(user_access_token, file_item.gdrive_file_id)
                    except Exception as e:
                        logger.warning(f"Could not delete cascaded file from Drive: {e}")
                db.delete(file_item)
                total_cascaded += 1

        if migration_tasks:
            try:
                migration_results = await asyncio.gather(*migration_tasks)
                for item, target_uid, new_gdrive_id in migration_results:
                    item.storage_user_id = target_uid
                    item.gdrive_file_id = new_gdrive_id
            except Exception as migration_err:
                db.rollback()
                logger.error(f"ABORTING account deletion for User {current_user.id}: Google Drive file migration failed ({migration_err}). DB rolled back.")
                raise HTTPException(
                    status_code=500,
                    detail=f"Account deletion aborted because Google Drive file migration failed: {migration_err}. Account and files remain intact."
                )


        db.commit()

        if user_access_token and membership.gdrive_folder_id:
            try:
                await gdrive_service.delete_file(user_access_token, membership.gdrive_folder_id, user=current_user, db=db)
            except Exception as e:
                logger.warning(f"Could not delete contribution folder {membership.gdrive_folder_id}: {e}")


    token_to_revoke = current_user.google_refresh_token or current_user.google_access_token
    if token_to_revoke:
        asyncio.create_task(gdrive_service.revoke_oauth_token(token_to_revoke))
        logger.info(f"Dispatched asynchronous Google OAuth token revocation for deleted User {current_user.id}")

    rooms_to_delete = []
    owned_rooms = db.query(Room).filter(Room.owner_id == current_user.id).all()
    for room in owned_rooms:
        remaining_memberships = [m for m in room.user_memberships if m.user_id != current_user.id]
        if remaining_memberships:
            room.owner_id = remaining_memberships[0].user_id
        else:
            rooms_to_delete.append(room)

    for r in rooms_to_delete:
        db.delete(r)

    db.flush()
    db.delete(current_user)
    db.commit()

    return {
        "message": "Account successfully deleted",
        "migrated_files_count": total_migrated,
        "cascaded_files_count": total_cascaded
    }
