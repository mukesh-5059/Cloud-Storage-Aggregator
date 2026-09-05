import logging
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserResponse, UserSelfResponse
from auth_utils import get_current_user

logger = logging.getLogger("users")
router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserSelfResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    logger.info(f"User ID {current_user.id} ({current_user.email}) accessed profile /users/me")
    return current_user

@router.delete("/me")
def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User ID {current_user.id} ({current_user.email}) requested account deletion")

    # 1. Revoke Google OAuth token if present
    token_to_revoke = current_user.google_access_token or current_user.google_refresh_token
    if token_to_revoke:
        try:
            revoke_url = f"https://oauth2.googleapis.com/revoke?token={token_to_revoke}"
            requests.post(revoke_url, headers={"Content-Type": "application/x-www-form-urlencoded"})
            logger.info(f"Revoked Google token for User ID {current_user.id} prior to account deletion")
        except Exception as e:
            logger.warning(f"Could not revoke Google token during account deletion: {e}")

    # 2. Handle room ownership transfers and room cleanup
    from models import Room
    owned_rooms = db.query(Room).filter(Room.owner_id == current_user.id).all()
    for room in owned_rooms:
        remaining_members = [m for m in room.members if m.id != current_user.id]
        if remaining_members:
            next_owner = remaining_members[0]
            room.owner_id = next_owner.id
            logger.info(f"Transferred ownership of Room ID {room.id} ('{room.name}') to User ID {next_owner.id}")
        else:
            logger.info(f"Killed Room ID {room.id} ('{room.name}') as User ID {current_user.id} was sole member")
            db.delete(room)

    # 3. Remove user from all room memberships
    current_user.joined_rooms.clear()

    # 4. Delete user record
    db.delete(current_user)
    db.commit()

    logger.info(f"Successfully deleted User ID {current_user.id} from database")
    return {"message": "Account successfully deleted"}

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

    my_room_ids = {r.id for r in current_user.joined_rooms}
    target_room_ids = {r.id for r in target_user.joined_rooms}

    shared_rooms = my_room_ids.intersection(target_room_ids)
    if not shared_rooms:
        logger.warning(f"SECURITY ALERT: User ID {current_user.id} attempted to view User ID {user_id} without sharing a room (403)")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not share a room with this user"
        )

    logger.info(f"User ID {current_user.id} authorized to view User ID {user_id} (Shared Room IDs: {list(shared_rooms)})")
    return target_user
