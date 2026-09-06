import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import User, Room, UserRoom, FileItem
from schemas import FileItemResponse, FolderCreateRequest, FileMoveRequest
from auth_utils import get_current_user

logger = logging.getLogger("files")
router = APIRouter(prefix="/files", tags=["Files"])

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

@router.post("/room/{room_id}/upload", response_model=FileItemResponse)
async def upload_file(
    room_id: int,
    file: UploadFile = File(...),
    parent_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_membership(current_user.id, room_id, db)

    content = await file.read()
    file_size = len(content)

    # Find room contributor with highest available free capacity in user_rooms
    memberships = db.query(UserRoom).filter(UserRoom.room_id == room_id).all()

    # Sort contributors by highest available free capacity (allocated_bytes - used_bytes)
    memberships.sort(key=lambda m: (m.allocated_bytes - m.used_bytes), reverse=True)

    target_contrib = None
    for m in memberships:
        if (m.allocated_bytes - m.used_bytes) >= file_size:
            target_contrib = m
            break

    if not target_contrib:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room storage quota exceeded! No room contributor has enough free quota."
        )

    mock_gdrive_file_id = f"gdrive_file_{room_id}_{target_contrib.user_id}_{file.filename}"

    file_item = FileItem(
        room_id=room_id,
        parent_id=parent_id,
        name=file.filename,
        is_folder=False,
        size_bytes=file_size,
        mime_type=file.content_type,
        uploader_id=current_user.id,
        storage_user_id=target_contrib.user_id,
        gdrive_file_id=mock_gdrive_file_id
    )

    # Deduct quota from target contributor & increment files hosted count
    target_contrib.used_bytes += file_size
    target_contrib.files_hosted_count += 1

    db.add(file_item)
    db.commit()
    db.refresh(file_item)
    logger.info(f"File '{file_item.name}' ({file_size} bytes) uploaded to Room {room_id}, hosted on User {target_contrib.user_id}'s GDrive")
    return file_item

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

def delete_item_recursively(item: FileItem, db: Session):
    # If folder, find all children and delete them recursively
    if item.is_folder:
        children = db.query(FileItem).filter(FileItem.parent_id == item.id).all()
        for child in children:
            delete_item_recursively(child, db)
    else:
        # Reclaim storage quota and decrement files_hosted_count from physical host contributor
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
