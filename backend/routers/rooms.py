import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User
from schemas import RoomCreate, RoomJoin, RoomResponse, UserResponse, StorageContributeRequest, ContributionResponse
from auth_utils import get_current_user
from services import room_service

logger = logging.getLogger("rooms")
router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.post(
    "", 
    response_model=RoomResponse,
    summary="Create Virtual Storage Room",
    description="Creates a new password-protected virtual storage room and registers the creator as room owner."
)
async def create_room(
    payload: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new virtual storage room with password access."""
    logger.info(f"User ID {current_user.id} ({current_user.email}) creating room '{payload.name}'")
    return await run_in_threadpool(room_service.create_room, db, payload.name, payload.password, current_user.id)

@router.post(
    "/{room_id}/join",
    summary="Join Storage Room with Password",
    description="Authenticates room password and adds the user as a contributing member of the virtual storage room."
)
async def join_room(
    room_id: int,
    payload: RoomJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Joins an existing virtual room using room password."""
    logger.info(f"User ID {current_user.id} joining Room ID {room_id}")
    return await run_in_threadpool(room_service.join_room, db, room_id, current_user.id, payload.password)

@router.get(
    "", 
    response_model=List[RoomResponse],
    summary="List Accessible Storage Rooms",
    description="Retrieves a list of all virtual storage rooms owned by or joined by the current user."
)
async def get_my_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists all rooms accessible to the authenticated user."""
    logger.info(f"User ID {current_user.id} fetching joined rooms list")
    return await run_in_threadpool(room_service.get_user_rooms, db, current_user.id)

@router.get(
    "/{room_id}/users", 
    response_model=List[UserResponse],
    summary="List Room Members",
    description="Lists all user profiles participating as members in a specific storage room."
)
async def get_room_users(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all member profiles contributing to the room."""
    logger.info(f"User ID {current_user.id} requesting members list for Room ID {room_id}")
    return await run_in_threadpool(room_service.get_room_members, db, room_id, current_user.id)

@router.post(
    "/{room_id}/contribute", 
    response_model=ContributionResponse,
    summary="Update Member Contributed Storage Quota",
    description="Updates the storage quota in bytes allocated by the user to the virtual storage pool, creating a dedicated Google Drive root folder if needed."
)
async def contribute_storage(
    room_id: int,
    payload: StorageContributeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allocates or updates member storage quota contribution in bytes."""
    logger.info(f"User ID {current_user.id} allocating {payload.allocated_bytes} bytes to Room ID {room_id}")
    return await room_service.contribute_storage(db, room_id, current_user, payload.allocated_bytes)

@router.get(
    "/{room_id}/dashboard",
    summary="Get Room Storage Dashboard Statistics",
    description="Retrieves aggregated storage metrics, pool capacity usage, file counts, and per-user allocation breakdowns for a room."
)
async def get_room_dashboard(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves consolidated storage pool statistics and member breakdown."""
    logger.info(f"Retrieved consolidated Dashboard for Room ID {room_id} (User ID {current_user.id})")
    return await run_in_threadpool(room_service.get_room_dashboard, db, room_id, current_user.id)

