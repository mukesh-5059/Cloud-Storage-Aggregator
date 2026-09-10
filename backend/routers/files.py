import logging
import json
import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Response, Request, BackgroundTasks
from fastapi.responses import StreamingResponse, RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db, SessionLocal
from models import User, Room, UserRoom, FileItem
from schemas import (
    FileItemResponse,
    FolderCreateRequest,
    FileMoveRequest,
    FileRenameRequest,
    UploadIntentRequest,
    UploadIntentResponse,
    UploadIntentBatchRequest,
    UploadIntentBatchResponse,
    UploadCompleteRequest
)
from auth_utils import get_current_user
from routers.auth import CLIENT_ID, CLIENT_SECRET

logger = logging.getLogger("files")
router = APIRouter(prefix="/files", tags=["Files"])


async def get_fresh_google_access_token(user: User, db: Session, force_refresh: bool = False) -> Optional[str]:
    """Retrieves access token for a user, using cached google_access_token unless force_refresh is True or token is missing."""
    if not user:
        return None
    if user.google_access_token and not force_refresh:
        return user.google_access_token

    if user.google_refresh_token:
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "refresh_token": user.google_refresh_token,
            "grant_type": "refresh_token"
        }
        try:
            logger.info(f"Refreshing Google access token for User ID {user.id} (force_refresh={force_refresh})...")
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(token_url, data=data)
                if res.status_code == 200:
                    tokens = res.json()
                    new_acc_token = tokens.get("access_token")
                    if new_acc_token:
                        user.google_access_token = new_acc_token
                        db.commit()
                        logger.info(f"Successfully refreshed Google access token for User ID {user.id}")
                        return new_acc_token
                else:
                    logger.error(f"Google Token Refresh API failed for User ID {user.id} ({res.status_code}): {res.text}")
        except Exception as e:
            logger.warning(f"Failed to refresh Google access token for User ID {user.id}: {e}")

    return user.google_access_token if not force_refresh else None


async def set_file_permission_background(gdrive_file_id: str, storage_user_id: int):
    """Sets 'anyone/reader' permission on Google Drive file in background task with token auto-refresh."""
    if not storage_user_id or not gdrive_file_id:
        return
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == storage_user_id).first()
        if not user:
            return
        access_token = await get_fresh_google_access_token(user, db)
        if not access_token:
            return

        perm_url = f"https://www.googleapis.com/drive/v3/files/{gdrive_file_id}/permissions"
        perm_data = {"role": "reader", "type": "anyone"}
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(perm_url, headers=headers, json=perm_data)
            if res.status_code == 401:
                logger.warning(f"Permission API got 401 for User ID {storage_user_id}. Force-refreshing token...")
                fresh_token = await get_fresh_google_access_token(user, db, force_refresh=True)
                if fresh_token:
                    headers["Authorization"] = f"Bearer {fresh_token}"
                    res = await client.post(perm_url, headers=headers, json=perm_data)

            if res.status_code in (200, 201):
                logger.info(f"Successfully set 'anyone/reader' permission for Drive file {gdrive_file_id} in background")
            else:
                logger.warning(f"Google Drive permission API status {res.status_code} for file {gdrive_file_id}: {res.text}")
    except Exception as e:
        logger.warning(f"Could not set 'anyone/reader' permission on Drive file {gdrive_file_id}: {e}")
    finally:
        db.close()


def check_membership(user_id: int, room_id: int, db: Session):
    membership = db.query(UserRoom).filter(
        UserRoom.user_id == user_id,
        UserRoom.room_id == room_id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Not a room member")
    return membership


@router.get("/room/{room_id}", response_model=List[FileItemResponse])
def list_files(
    room_id: int,
    parent_id: Optional[int] = Query(None, description="Parent folder ID. Omit or null for root directory."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_membership(current_user.id, room_id, db)

    files = db.query(FileItem).filter(
        FileItem.room_id == room_id,
        FileItem.parent_id == parent_id
    ).all()

    for item in files:
        item.uploader_name = item.uploader.name if item.uploader else "Unknown"
        item.host_name = item.storage_user.name if item.storage_user else "Unknown"

    return files


@router.get("/room/{room_id}/search", response_model=List[FileItemResponse])
def search_files(
    room_id: int,
    q: str = Query(..., description="Search query string for matching file/folder names"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_membership(current_user.id, room_id, db)

    if not q or not q.strip():
        return []

    query_str = f"%{q.strip()}%"
    files = db.query(FileItem).filter(
        FileItem.room_id == room_id,
        FileItem.name.ilike(query_str)
    ).all()

    for item in files:
        item.uploader_name = item.uploader.name if item.uploader else "Unknown"
        item.host_name = item.storage_user.name if item.storage_user else "Unknown"

    return files


@router.post("/room/{room_id}/folder", response_model=FileItemResponse)
def create_folder(
    room_id: int,
    payload: FolderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_membership(current_user.id, room_id, db)

    folder_name = payload.name.strip()
    if not folder_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder name cannot be empty")

    if payload.parent_id:
        parent = db.query(FileItem).filter(FileItem.id == payload.parent_id, FileItem.room_id == room_id).first()
        if not parent or not parent.is_folder:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parent folder ID")

    new_folder = FileItem(
        room_id=room_id,
        parent_id=payload.parent_id,
        name=folder_name,
        is_folder=True,
        size_bytes=0,
        uploader_id=current_user.id,
        storage_user_id=None
    )

    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)

    new_folder.uploader_name = current_user.name
    new_folder.host_name = "N/A (Folder)"

    logger.info(f"Created folder '{folder_name}' (ID {new_folder.id}) in Room ID {room_id}")
    return new_folder


# ==========================================
# 3-Step Resumable Upload Flow
# ==========================================

@router.post("/room/{room_id}/upload-intent-batch", response_model=UploadIntentBatchResponse)
async def upload_intent_batch(
    room_id: int,
    payload: UploadIntentBatchRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Step 1 of 3 (Batch): Requests upload URLs for multiple files in parallel via asyncio.gather."""
    check_membership(current_user.id, room_id, db)
    if not payload.items:
        return UploadIntentBatchResponse(intents=[])

    client_origin = request.headers.get("origin") or "http://localhost:3000"

    contributors = db.query(UserRoom).filter(UserRoom.room_id == room_id).all()
    if not contributors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No storage contributors found in room")

    contrib_free_bytes = {
        c.user_id: (c.allocated_bytes - c.used_bytes)
        for c in contributors
    }

    file_host_assignments = []
    user_ids_needed = set()

    for item in payload.items:
        target_contrib = None
        for contrib in contributors:
            if contrib_free_bytes[contrib.user_id] >= item.size_bytes:
                target_contrib = contrib
                contrib_free_bytes[contrib.user_id] -= item.size_bytes
                break

        if not target_contrib:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room storage quota exceeded for file '{item.name}' ({item.size_bytes} bytes)."
            )

        file_host_assignments.append((item, target_contrib))
        user_ids_needed.add(target_contrib.user_id)

    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids_needed)).all()}

    tokens_map = {}
    for uid, user in users_map.items():
        token = await get_fresh_google_access_token(user, db)
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Host contributor {user.name} has no active Google OAuth authorization."
            )
        tokens_map[uid] = token

    semaphore = asyncio.Semaphore(3)

    async def fetch_single_intent(client: httpx.AsyncClient, item: UploadIntentRequest, target_contrib: UserRoom):
        async with semaphore:
            storage_user = users_map.get(target_contrib.user_id)
            access_token = tokens_map.get(target_contrib.user_id)

            metadata = {
                "name": item.name,
                "mimeType": item.mime_type or "application/octet-stream"
            }
            if target_contrib.gdrive_folder_id:
                metadata["parents"] = [target_contrib.gdrive_folder_id]

            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Upload-Content-Type": item.mime_type or "application/octet-stream",
                "X-Upload-Content-Length": str(item.size_bytes),
                "Content-Type": "application/json; charset=UTF-8",
                "Origin": client_origin
            }

            gdrive_res = await client.post(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
                headers=headers,
                json=metadata
            )

            if gdrive_res.status_code == 401 and storage_user:
                logger.warning(f"Access token expired (401) for User ID {storage_user.id}. Force-refreshing token...")
                fresh_token = await get_fresh_google_access_token(storage_user, db, force_refresh=True)
                if fresh_token:
                    headers["Authorization"] = f"Bearer {fresh_token}"
                    gdrive_res = await client.post(
                        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
                        headers=headers,
                        json=metadata
                    )

            if gdrive_res.status_code == 200 and "Location" in gdrive_res.headers:
                return UploadIntentResponse(
                    upload_url=gdrive_res.headers["Location"],
                    storage_user_id=target_contrib.user_id,
                    storage_user_name=storage_user.name if storage_user else "Unknown"
                )
            else:
                logger.error(f"Google Drive API intent failed for '{item.name}' ({gdrive_res.status_code}): {gdrive_res.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Google Drive API error for '{item.name}': {gdrive_res.text}"
                )

    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = []
        for idx, (item, contrib) in enumerate(file_host_assignments):
            if idx > 0:
                await asyncio.sleep(0.05)
            tasks.append(fetch_single_intent(client, item, contrib))
        results = await asyncio.gather(*tasks)

    return UploadIntentBatchResponse(intents=list(results))


@router.post("/room/{room_id}/complete-upload", response_model=FileItemResponse)
async def complete_upload(
    room_id: int,
    payload: UploadCompleteRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Step 3 of 3-step upload: Confirms file in DB and updates contributor quota after direct Drive upload."""
    check_membership(current_user.id, room_id, db)

    target_contrib = db.query(UserRoom).filter(
        UserRoom.room_id == room_id,
        UserRoom.user_id == payload.storage_user_id
    ).first()

    if not target_contrib:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified storage user is not a contributor in this room."
        )

    if (target_contrib.allocated_bytes - target_contrib.used_bytes) < payload.size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Storage quota exceeded for the specified host contributor."
        )

    storage_user = db.query(User).filter(User.id == payload.storage_user_id).first()

    # Schedule setting file permission to 'anyone/reader' in background task to avoid blocking API response
    if payload.storage_user_id:
        background_tasks.add_task(set_file_permission_background, payload.gdrive_file_id, payload.storage_user_id)

    file_item = FileItem(
        room_id=room_id,
        parent_id=payload.parent_id,
        name=payload.name,
        is_folder=False,
        size_bytes=payload.size_bytes,
        mime_type=payload.mime_type,
        uploader_id=current_user.id,
        storage_user_id=payload.storage_user_id,
        gdrive_file_id=payload.gdrive_file_id
    )

    # Deduct quota from host contributor & increment files hosted count
    target_contrib.used_bytes += payload.size_bytes
    target_contrib.files_hosted_count += 1

    db.add(file_item)
    db.commit()
    db.refresh(file_item)

    file_item.uploader_name = current_user.name
    file_item.host_name = storage_user.name if storage_user else "Unknown"

    logger.info(f"Completed upload for '{file_item.name}' (ID {file_item.id}) in Room {room_id}, hosted on User {file_item.storage_user_id}")
    return file_item


@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File item not found")

    check_membership(current_user.id, item.room_id, db)

    if item.is_folder:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot download a folder")

    if not item.gdrive_file_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File has no Google Drive ID stored")

    direct_url = f"https://drive.google.com/uc?id={item.gdrive_file_id}&export=download"
    logger.info(f"Redirecting download for file '{item.name}' (ID {item.id}) directly to Google Drive CDN")
    return RedirectResponse(url=direct_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.patch("/{file_id}/move", response_model=FileItemResponse)
def move_file(
    file_id: int,
    payload: FileMoveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File item not found")

    check_membership(current_user.id, item.room_id, db)

    if payload.new_parent_id:
        new_parent = db.query(FileItem).filter(
            FileItem.id == payload.new_parent_id,
            FileItem.room_id == item.room_id
        ).first()
        if not new_parent or not new_parent.is_folder:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target folder ID")

    item.parent_id = payload.new_parent_id
    db.commit()
    db.refresh(item)
    logger.info(f"Moved item ID {item.id} ('{item.name}') to parent_id {item.parent_id}")
    return item


@router.patch("/{file_id}/rename", response_model=FileItemResponse)
async def rename_file(
    file_id: int,
    payload: FileRenameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File item not found")

    check_membership(current_user.id, item.room_id, db)

    new_name = payload.new_name.strip()
    if not new_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File name cannot be empty")

    old_name = item.name

    if not item.is_folder and item.gdrive_file_id and item.storage_user_id:
        storage_user = db.query(User).filter(User.id == item.storage_user_id).first()
        access_token = await get_fresh_google_access_token(storage_user, db) if storage_user else None

        if access_token:
            try:
                drive_url = f"https://www.googleapis.com/drive/v3/files/{item.gdrive_file_id}"
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    gdrive_res = await client.patch(drive_url, headers=headers, json={"name": new_name})
                    if gdrive_res.status_code == 401 and storage_user:
                        logger.warning(f"Access token expired (401) for User ID {storage_user.id} during rename. Force refreshing...")
                        fresh_token = await get_fresh_google_access_token(storage_user, db, force_refresh=True)
                        if fresh_token:
                            headers["Authorization"] = f"Bearer {fresh_token}"
                            gdrive_res = await client.patch(drive_url, headers=headers, json={"name": new_name})
                    if gdrive_res.status_code == 200:
                        logger.info(f"Renamed file {item.gdrive_file_id} on Google Drive to '{new_name}'")
                    else:
                        logger.warning(f"Failed to rename file on Google Drive ({gdrive_res.status_code}): {gdrive_res.text}")
            except Exception as e:
                logger.warning(f"Error calling Google Drive API to rename file {item.gdrive_file_id}: {e}")

    item.name = new_name
    db.commit()
    db.refresh(item)

    item.uploader_name = item.uploader.name if item.uploader else "Unknown"
    item.host_name = item.storage_user.name if item.storage_user else "Unknown"

    logger.info(f"Renamed item ID {item.id} from '{old_name}' to '{new_name}'")
    return item


async def delete_item_recursively(item: FileItem, db: Session):
    if item.is_folder:
        children = db.query(FileItem).filter(FileItem.parent_id == item.id).all()
        for child in children:
            await delete_item_recursively(child, db)
    else:
        if item.storage_user_id and item.gdrive_file_id:
            storage_user = db.query(User).filter(User.id == item.storage_user_id).first()
            access_token = await get_fresh_google_access_token(storage_user, db) if storage_user else None
            if access_token:
                try:
                    drive_url = f"https://www.googleapis.com/drive/v3/files/{item.gdrive_file_id}"
                    headers = {"Authorization": f"Bearer {access_token}"}
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        del_res = await client.delete(drive_url, headers=headers)
                        if del_res.status_code == 401 and storage_user:
                            logger.warning(f"Access token expired (401) for User ID {storage_user.id} during file delete. Force refreshing...")
                            fresh_token = await get_fresh_google_access_token(storage_user, db, force_refresh=True)
                            if fresh_token:
                                headers["Authorization"] = f"Bearer {fresh_token}"
                                del_res = await client.delete(drive_url, headers=headers)
                        if del_res.status_code in (200, 204):
                            logger.info(f"Successfully deleted Drive file {item.gdrive_file_id}")
                        else:
                            logger.warning(f"Google Drive delete status {del_res.status_code} for {item.gdrive_file_id}: {del_res.text}")
                except Exception as e:
                    logger.warning(f"Failed to delete file {item.gdrive_file_id} from Google Drive: {e}")

        if item.storage_user_id:
            membership = db.query(UserRoom).filter(
                UserRoom.room_id == item.room_id,
                UserRoom.user_id == item.storage_user_id
            ).first()
            if membership:
                membership.used_bytes = max(0, membership.used_bytes - item.size_bytes)
                membership.files_hosted_count = max(0, membership.files_hosted_count - 1)

    db.delete(item)
    db.commit()


@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File item not found")

    check_membership(current_user.id, item.room_id, db)
    room_id = item.room_id

    await delete_item_recursively(item, db)

    logger.info(f"Deleted item ID {file_id} from Room {room_id}")
    return {"message": "Item deleted successfully", "id": file_id}
