import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas import GoogleSignUpRequest, GoogleLoginRequest, TokenResponse
from services import auth_service

logger = logging.getLogger("auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=TokenResponse)
async def signup(payload: GoogleSignUpRequest, db: Session = Depends(get_db)):
    return await auth_service.signup_google_user(payload, db)

@router.post("/login", response_model=TokenResponse)
async def login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    return await auth_service.login_google_user(payload, db)
