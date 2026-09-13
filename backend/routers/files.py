import logging
from fastapi import APIRouter, Depends, Query, Request, BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import User
from schemas import (
    FileItemResponse,
    FolderCreateRequest,
    FileMoveRequest,
    FileRenameRequest,
    UploadIntentBatchRequest,
    UploadIntentBatchResponse,
    UploadCompleteRequest
)
from auth_utils import get_current_user
from services import file_service

logger = logging.getLogger("files")
router = APIRouter(prefix="/files", tags=["Files"])

@router.get("/room/{room_id}", response_model=List[FileItemResponse])
def list_files(
    room_id: int,
    parent_id: Optional[int] = Query(None, description="Parent folder ID. Omit or null for root directory."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return file_service.list_room_files(db, current_user.id, room_id, parent_id)

@router.get("/room/{room_id}/search", response_model=List[FileItemResponse])
def search_files(
    room_id: int,
    q: str = Query(..., description="Search query string for matching file/folder names"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return file_service.search_room_files(db, current_user.id, room_id, q)

@router.post("/room/{room_id}/folder", response_model=FileItemResponse)
def create_folder(
    room_id: int,
    payload: FolderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return file_service.create_room_folder(db, current_user.id, current_user.name, room_id, payload)

@router.post("/room/{room_id}/upload-intent-batch", response_model=UploadIntentBatchResponse)
async def upload_intent_batch(
    room_id: int,
    payload: UploadIntentBatchRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_origin = request.headers.get("origin")
    return await file_service.process_upload_intent_batch(db, current_user.id, room_id, payload, client_origin)

@router.post("/room/{room_id}/complete-upload", response_model=FileItemResponse)
async def complete_upload(
    room_id: int,
    payload: UploadCompleteRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await run_in_threadpool(file_service.complete_file_upload, db, current_user, room_id, payload, background_tasks)

@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return file_service.get_file_download_url(db, current_user.id, file_id)

@router.patch("/{file_id}/move", response_model=FileItemResponse)
def move_file(
    file_id: int,
    payload: FileMoveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return file_service.move_file_item(db, current_user.id, file_id, payload)

@router.patch("/{file_id}/rename", response_model=FileItemResponse)
async def rename_file(
    file_id: int,
    payload: FileRenameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await file_service.rename_file_item(db, current_user.id, file_id, payload)

@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await run_in_threadpool(file_service.delete_file_item, db, current_user.id, file_id, background_tasks)

