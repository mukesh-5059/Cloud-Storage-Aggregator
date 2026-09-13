import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import (
    UserResponse,
    UserSelfResponse,
    AccountDeletionPreviewResponse
)
from auth_utils import get_current_user
from services import user_service

logger = logging.getLogger("users")
router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserSelfResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    logger.info(f"User ID {current_user.id} ({current_user.email}) accessed profile /users/me")
    return current_user

@router.get("/me/deletion-preview", response_model=AccountDeletionPreviewResponse)
async def get_account_deletion_preview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Simulates multi-room bin-packing account deletion dry-run preview."""
    logger.info(f"User ID {current_user.id} ({current_user.email}) requested account deletion preview")
    return await run_in_threadpool(user_service.simulate_deletion_bin_packing, db, current_user)

@router.delete("/me")
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Executes real Google Drive API physical file streams, cascades, and user account deletion."""
    logger.info(f"Executing real account deletion for User ID {current_user.id} ({current_user.email})")
    return await user_service.execute_account_deletion(db, current_user)

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    my_room_ids = {m.room_id for m in current_user.room_memberships}
    target_room_ids = {m.room_id for m in target_user.room_memberships}

    shared_rooms = my_room_ids.intersection(target_room_ids)
    if not shared_rooms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not share a room with this user"
        )

    return target_user
