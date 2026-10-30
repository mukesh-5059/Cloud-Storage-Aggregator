import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth_utils import get_current_user
from schemas import (
    GoogleSignUpRequest, 
    GoogleLoginRequest, 
    TokenResponse,
    MFASetupResponse,
    MFAVerifyRequest,
    MFAVerifyResponse
)
from services import auth_service
import totp_utils

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

@router.post(
    "/mfa/setup",
    response_model=MFASetupResponse,
    summary="Initialize TOTP MFA Authenticator Setup",
    description="Generates an RFC 6238 TOTP secret key and Google Authenticator URI for multi-factor authentication."
)
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    secret = totp_utils.generate_totp_secret()
    current_user.mfa_secret = secret
    db.commit()
    otpauth_url = totp_utils.get_totp_uri(secret, current_user.email, issuer="GatherAround")
    return MFASetupResponse(
        secret=secret,
        otpauth_url=otpauth_url,
        message="Scan otpauth_url with Google or Microsoft Authenticator or enter the secret manually."
    )

@router.post(
    "/mfa/verify",
    response_model=MFAVerifyResponse,
    summary="Verify TOTP Authenticator Code",
    description="Verifies the 6-digit TOTP code from Google or Microsoft Authenticator to complete multi-factor authentication."
)
async def verify_mfa(
    payload: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not set up for this user. Call /auth/mfa/setup first."
        )
    is_valid = totp_utils.verify_totp(current_user.mfa_secret, payload.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired TOTP authenticator code."
        )
    current_user.mfa_enabled = True
    db.commit()
    return MFAVerifyResponse(
        status="success",
        message="MFA verified and activated successfully.",
        mfa_enabled=True
    )
