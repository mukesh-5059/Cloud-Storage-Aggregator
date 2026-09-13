import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas import GoogleSignUpRequest, GoogleLoginRequest, TokenResponse
from services import auth_service

logger = logging.getLogger("auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/signup", 
    response_model=TokenResponse,
    summary="Register New User Account via Google OAuth",
    description="Exchanges a Google OAuth 2.0 authorization code for user profile credentials, initializes user storage metrics, and returns a JWT access token."
)
async def signup(payload: GoogleSignUpRequest, db: Session = Depends(get_db)):
    """Registers a new user account using Google OAuth 2.0 credentials."""
    return await auth_service.signup_google_user(payload, db)

@router.post(
    "/login", 
    response_model=TokenResponse,
    summary="Authenticate User via Google OAuth",
    description="Authenticates an existing user via Google OAuth 2.0 token exchange and returns an authorized session JWT token."
)
async def login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Authenticates an existing user and returns a session JWT token."""
    return await auth_service.login_google_user(payload, db)
