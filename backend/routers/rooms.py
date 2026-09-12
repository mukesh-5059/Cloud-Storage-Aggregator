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

@router.post("", response_model=RoomResponse)
async def create_room(
    payload: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} ({current_user.email}) creating room '{payload.name}'")
    return await run_in_threadpool(room_service.create_room, db, payload.name, payload.password, current_user.id)

@router.post("/{room_id}/join")
async def join_room(
    room_id: int,
    payload: RoomJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} joining Room ID {room_id}")
    return await run_in_threadpool(room_service.join_room, db, room_id, current_user.id, payload.password)

@router.get("", response_model=List[RoomResponse])
async def get_my_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} fetching joined rooms list")
    return await run_in_threadpool(room_service.get_user_rooms, db, current_user.id)

@router.get("/{room_id}/users", response_model=List[UserResponse])
async def get_room_users(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} requesting members list for Room ID {room_id}")
    return await run_in_threadpool(room_service.get_room_members, db, room_id, current_user.id)

@router.post("/{room_id}/contribute", response_model=ContributionResponse)
async def contribute_storage(
    room_id: int,
    payload: StorageContributeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} allocating {payload.allocated_bytes} bytes to Room ID {room_id}")
    return await room_service.contribute_storage(db, room_id, current_user, payload.allocated_bytes)

@router.get("/{room_id}/dashboard")
async def get_room_dashboard(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"Retrieved consolidated Dashboard for Room ID {room_id} (User ID {current_user.id})")
    return await run_in_threadpool(room_service.get_room_dashboard, db, room_id, current_user.id)

