import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, Room
from schemas import RoomCreate, RoomJoin, RoomResponse, UserResponse
from auth_utils import get_current_user

logger = logging.getLogger("rooms")
router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.post("", response_model=RoomResponse)
def create_room(
    payload: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} ({current_user.email}) creating room '{payload.name}'")
    room = Room(
        name=payload.name,
        password=payload.password,
        owner_id=current_user.id
    )
    room.members.append(current_user)
    db.add(room)
    db.commit()
    db.refresh(room)
    logger.info(f"Created Room ID {room.id} ('{room.name}') owned by User ID {current_user.id}")
    return room

@router.post("/{room_id}/join")
def join_room(
    room_id: int,
    payload: RoomJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} attempting to join Room ID {room_id}")
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        logger.warning(f"Join failed: Room ID {room_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    if room.password != payload.password:
        logger.warning(f"SECURITY ALERT: User ID {current_user.id} failed password check for Room ID {room_id}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid room password")

    if current_user in room.members:
        logger.info(f"User ID {current_user.id} is already a member of Room ID {room_id}")
        return {"message": "User is already a member of this room"}

    room.members.append(current_user)
    db.commit()
    logger.info(f"User ID {current_user.id} successfully joined Room ID {room_id}")
    return {"message": "Successfully joined room"}

@router.get("", response_model=List[RoomResponse])
def get_my_rooms(
    current_user: User = Depends(get_current_user)
):
    logger.info(f"User ID {current_user.id} fetching joined rooms list ({len(current_user.joined_rooms)} rooms found)")
    return current_user.joined_rooms

@router.get("/{room_id}/users", response_model=List[UserResponse])
def get_room_users(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} requesting members list for Room ID {room_id}")
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        logger.warning(f"Fetch members failed: Room ID {room_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    if current_user not in room.members:
        logger.warning(f"SECURITY ALERT: User ID {current_user.id} attempted to view members of Room ID {room_id} without membership (403)")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not a member of this room"
        )

    logger.info(f"Retrieved {len(room.members)} members for Room ID {room_id}")
    return room.members
