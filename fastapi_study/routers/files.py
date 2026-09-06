import logging
import json
import requests
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Response, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import User, Room, UserRoom, FileItem
from schemas import (
    FileItemResponse,
    FolderCreateRequest,
    FileMoveRequest,
    FileRenameRequest,
    UploadIntentRequest,
    UploadIntentResponse,
    UploadCompleteRequest
)
from auth_utils import get_current_user
from routers.auth import CLIENT_ID, CLIENT_SECRET

logger = logging.getLogger("files")
router = APIRouter(prefix="/files", tags=["Files"])



def get_fresh_google_access_token(user: User, db: Session) -> Optional[str]:
    """Retrieves a fresh Google OAuth access token for a user, refreshing it if possible."""
    if not user:
        return None
    if user.google_refresh_token:
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "refresh_token": user.google_refresh_token,
            "grant_type": "refresh_token"
        }
        try:
            res = requests.post(token_url, data=data)
            if res.status_code == 200:
                tokens = res.json()
                new_acc_token = tokens.get("access_token")
                if new_acc_token:
                    user.google_access_token = new_acc_token
                    db.commit()
                    return new_acc_token
        except Exception as e:
            logger.warning(f"Failed to refresh Google access token for User ID {user.id}: {e}")
    return user.google_access_token




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
    q: str = Query(..., min_length=1, description="Search term across room filesystem"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_membership(current_user.id, room_id, db)

    results = db.query(FileItem).filter(
        FileItem.room_id == room_id,
        FileItem.name.ilike(f"%{q}%")
    ).all()

    for item in results:
        item.uploader_name = item.uploader.name if item.uploader else "Unknown"
        item.host_name = item.storage_user.name if item.storage_user else "Unknown"

    return results


@router.post("/room/{room_id}/folder", response_model=FileItemResponse)
def create_folder(
    room_id: int,
    payload: FolderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_membership(current_user.id, room_id, db)

    if payload.parent_id:
        parent = db.query(FileItem).filter(FileItem.id == payload.parent_id, FileItem.room_id == room_id).first()
        if not parent or not parent.is_folder:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parent folder ID")

    folder_item = FileItem(
        room_id=room_id,
        parent_id=payload.parent_id,
        name=payload.name,
        is_folder=True,
        size_bytes=0,
        uploader_id=current_user.id
    )
    db.add(folder_item)
    db.commit()
    db.refresh(folder_item)
    logger.info(f"Created folder '{folder_item.name}' (ID {folder_item.id}) in Room ID {room_id}")
    return folder_item


# ==========================================
# 3-Step Resumable Upload Flow (Endpoints 1 & 2)
# ==========================================

@router.post("/room/{room_id}/upload-intent", response_model=UploadIntentResponse)
def create_upload_intent(
    room_id: int,
    payload: UploadIntentRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Step 1 of 3-step upload: Generates Google Drive Resumable Upload URL."""
    check_membership(current_user.id, room_id, db)

    if payload.parent_id:
        parent = db.query(FileItem).filter(FileItem.id == payload.parent_id, FileItem.room_id == room_id).first()
        if not parent or not parent.is_folder:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parent folder ID")

    # Find room contributor with highest available free capacity in user_rooms
    memberships = db.query(UserRoom).filter(UserRoom.room_id == room_id).all()
    memberships.sort(key=lambda m: (m.allocated_bytes - m.used_bytes), reverse=True)

    target_contrib = None
    for m in memberships:
        if (m.allocated_bytes - m.used_bytes) >= payload.size_bytes:
            target_contrib = m
            break

    if not target_contrib:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room storage quota exceeded! No room contributor has enough free quota."
        )

    storage_user = db.query(User).filter(User.id == target_contrib.user_id).first()
    if not storage_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target host contributor user not found")

    access_token = get_fresh_google_access_token(storage_user, db)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Host contributor has no active Google OAuth authorization."
        )

    try:
        metadata = {
            "name": payload.name,
            "mimeType": payload.mime_type or "application/octet-stream"
        }
        if target_contrib.gdrive_folder_id:
            metadata["parents"] = [target_contrib.gdrive_folder_id]

        client_origin = request.headers.get("origin") or "http://localhost:3000"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Upload-Content-Type": payload.mime_type or "application/octet-stream",
            "X-Upload-Content-Length": str(payload.size_bytes),
            "Content-Type": "application/json; charset=UTF-8",
            "Origin": client_origin
        }

        gdrive_res = requests.post(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
            headers=headers,
            data=json.dumps(metadata)
        )

        if gdrive_res.status_code == 200 and "Location" in gdrive_res.headers:
            upload_url = gdrive_res.headers["Location"]
            logger.info(f"Generated Google Drive resumable upload URL for '{payload.name}'")
        else:
            logger.error(f"Google Drive API intent failed ({gdrive_res.status_code}): {gdrive_res.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Google Drive API error: {gdrive_res.text}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calling Google Drive API for upload intent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Google Drive upload: {str(e)}"
        )

    return UploadIntentResponse(
        upload_url=upload_url,
        storage_user_id=target_contrib.user_id,
        storage_user_name=storage_user.name
    )


@router.post("/room/{room_id}/complete-upload", response_model=FileItemResponse)
def complete_upload(
    room_id: int,
    payload: UploadCompleteRequest,
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
    access_token = get_fresh_google_access_token(storage_user, db) if storage_user else None

    # Set file permission to 'anyone/reader' so preview iframe works for all room members
    if access_token:
        try:
            perm_url = f"https://www.googleapis.com/drive/v3/files/{payload.gdrive_file_id}/permissions"
            perm_data = {"role": "reader", "type": "anyone"}
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            requests.post(perm_url, headers=headers, data=json.dumps(perm_data))
        except Exception as e:
            logger.warning(f"Could not set 'anyone/reader' permission on Drive file {payload.gdrive_file_id}: {e}")

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
def download_file(
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

    storage_user = db.query(User).filter(User.id == item.storage_user_id).first() if item.storage_user_id else None
    if not storage_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host contributor user record missing")

    access_token = get_fresh_google_access_token(storage_user, db)
    if not access_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host contributor has no active Google OAuth authorization")

    try:
        drive_url = f"https://www.googleapis.com/drive/v3/files/{item.gdrive_file_id}?alt=media"
        headers = {"Authorization": f"Bearer {access_token}"}
        gdrive_res = requests.get(drive_url, headers=headers, stream=True)

        if gdrive_res.status_code == 200:
            def iterfile():
                for chunk in gdrive_res.iter_content(chunk_size=8192):
                    if chunk:
                        yield chunk

            return StreamingResponse(
                iterfile(),
                media_type=item.mime_type or "application/octet-stream",
                headers={"Content-Disposition": f'attachment; filename="{item.name}"'}
            )
        else:
            logger.error(f"Google Drive API download failed ({gdrive_res.status_code}): {gdrive_res.text}")
            raise HTTPException(
                status_code=gdrive_res.status_code if gdrive_res.status_code in (404, 403, 401) else status.HTTP_502_BAD_GATEWAY,
                detail=f"Google Drive API download error ({gdrive_res.status_code}): {gdrive_res.text}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading from Google Drive API: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Download error: {str(e)}")


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
def rename_file(
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
        access_token = get_fresh_google_access_token(storage_user, db) if storage_user else None

        if access_token:
            try:
                drive_url = f"https://www.googleapis.com/drive/v3/files/{item.gdrive_file_id}"
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                gdrive_res = requests.patch(drive_url, headers=headers, data=json.dumps({"name": new_name}))
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



def delete_item_recursively(item: FileItem, db: Session):
    if item.is_folder:
        children = db.query(FileItem).filter(FileItem.parent_id == item.id).all()
        for child in children:
            delete_item_recursively(child, db)
    else:
        if item.storage_user_id and item.gdrive_file_id:
            storage_user = db.query(User).filter(User.id == item.storage_user_id).first()
            access_token = get_fresh_google_access_token(storage_user, db) if storage_user else None
            if access_token:
                try:
                    drive_url = f"https://www.googleapis.com/drive/v3/files/{item.gdrive_file_id}"
                    headers = {"Authorization": f"Bearer {access_token}"}
                    requests.delete(drive_url, headers=headers)
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


@router.delete("/{file_id}")
def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File item not found")

    check_membership(current_user.id, item.room_id, db)

    item_name = item.name
    is_folder = item.is_folder

    delete_item_recursively(item, db)
    db.commit()

    logger.info(f"Recursively deleted {'folder' if is_folder else 'file'} item ID {file_id} ('{item_name}')")
    return {"message": f"{'Folder and all its contents' if is_folder else 'File'} deleted successfully"}
