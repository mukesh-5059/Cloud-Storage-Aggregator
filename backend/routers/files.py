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

@router.get(
    "/room/{room_id}", 
    response_model=List[FileItemResponse],
    summary="List Virtual Files & Directories",
    description="Retrieves the virtual file system hierarchy for a room. Accepts an optional parent_id to navigate nested subdirectories."
)
def list_files(
    room_id: int,
    parent_id: Optional[int] = Query(None, description="Parent folder ID. Omit or null for root directory."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves virtual folder hierarchy and file placement records."""
    return file_service.list_room_files(db, current_user.id, room_id, parent_id)

@router.get(
    "/room/{room_id}/search", 
    response_model=List[FileItemResponse],
    summary="Search Files by Keyword",
    description="Performs keyword search across all virtual files and folders in a room matching query string 'q'."
)
def search_files(
    room_id: int,
    q: str = Query(..., description="Search query string for matching file/folder names"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Searches room files and folders matching keyword query string."""
    return file_service.search_room_files(db, current_user.id, room_id, q)

@router.post(
    "/room/{room_id}/folder", 
    response_model=FileItemResponse,
    summary="Create Virtual Directory",
    description="Creates a new virtual folder entry in PostgreSQL under an optional parent directory."
)
def create_folder(
    room_id: int,
    payload: FolderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a virtual folder within the room hierarchy."""
    return file_service.create_room_folder(db, current_user.id, current_user.name, room_id, payload)

@router.post(
    "/room/{room_id}/upload-intent-batch", 
    response_model=UploadIntentBatchResponse,
    summary="Evaluate Greedy Bin-Packing Placement",
    description="Runs the greedy bin-packing algorithm over active room member storage quotas to select target Google Drive destination accounts for file uploads."
)
async def upload_intent_batch(
    room_id: int,
    payload: UploadIntentBatchRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Evaluates bin-packing placement and returns target Drive upload destinations."""
    client_origin = request.headers.get("origin")
    return await file_service.process_upload_intent_batch(db, current_user.id, room_id, payload, client_origin)

@router.post(
    "/room/{room_id}/complete-upload", 
    response_model=FileItemResponse,
    summary="Save Upload Record & Link Remote Drive ID",
    description="Finalizes file upload by persisting metadata, linking Google Drive asset ID, and updating user quota usage."
)
async def complete_upload(
    room_id: int,
    payload: UploadCompleteRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Saves file placement metadata and links Google Drive asset ID."""
    return await run_in_threadpool(file_service.complete_file_upload, db, current_user, room_id, payload, background_tasks)

@router.get(
    "/{file_id}/download",
    summary="Stream File Directly from Google Drive",
    description="Fetches download credentials and streams target physical file content directly from Google Drive API v3."
)
async def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Streams file download directly from target Google Drive account."""
    return await file_service.get_file_download_url(db, current_user.id, file_id)

@router.patch(
    "/{file_id}/move", 
    response_model=FileItemResponse,
    summary="Relocate File or Folder Directory",
    description="Relocates a virtual file or folder to a new parent directory ID in the virtual folder hierarchy."
)
def move_file(
    file_id: int,
    payload: FileMoveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Relocates virtual file or folder to new parent directory."""
    return file_service.move_file_item(db, current_user.id, file_id, payload)

@router.patch(
    "/{file_id}/rename", 
    response_model=FileItemResponse,
    summary="Rename Virtual File or Folder",
    description="Updates virtual file or folder display name in PostgreSQL metadata."
)
async def rename_file(
    file_id: int,
    payload: FileRenameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Renames virtual file or folder entry."""
    return await file_service.rename_file_item(db, current_user.id, file_id, payload)

@router.delete(
    "/{file_id}",
    summary="Delete File Metadata & Remote Drive Asset",
    description="Deletes virtual file metadata from PostgreSQL and initiates a background task to delete the physical asset from Google Drive."
)
async def delete_file(
    file_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes virtual file record and cascades physical deletion to Google Drive."""
    return await run_in_threadpool(file_service.delete_file_item, db, current_user.id, file_id, background_tasks)

