import logging
import json
import os
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import GoogleSignUpRequest, GoogleLoginRequest, TokenResponse, UserResponse
from auth_utils import create_access_token

logger = logging.getLogger("auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

CLIENT_CREDENTIALS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "client_with_gdrive.json")

ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(ENV_FILE):
    try:
        with open(ENV_FILE, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ.setdefault(k, v)
    except Exception:
        pass

CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")

if os.path.exists(CLIENT_CREDENTIALS_FILE):
    try:
        with open(CLIENT_CREDENTIALS_FILE, "r") as f:
            creds = json.load(f).get("web", {})
            CLIENT_ID = creds.get("client_id", CLIENT_ID)
            CLIENT_SECRET = creds.get("client_secret", CLIENT_SECRET)
    except Exception as e:
        logger.warning(f"Failed to load client_with_gdrive.json: {e}")

@router.post("/signup", response_model=TokenResponse)
def signup(payload: GoogleSignUpRequest, db: Session = Depends(get_db)):
    logger.info("Processing Sign-Up request with Google authorization code...")
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": payload.code,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": "postmessage",
        "grant_type": "authorization_code"
    }

    token_response = requests.post(token_url, data=data)
    if token_response.status_code != 200:
        logger.error(f"Google Code Exchange failed ({token_response.status_code}): {token_response.text}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google Code Exchange failed: {token_response.text}"
        )

    tokens = token_response.json()
    google_access_token = tokens.get("access_token")
    google_refresh_token = tokens.get("refresh_token")

    userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
    headers = {"Authorization": f"Bearer {google_access_token}"}
    userinfo_res = requests.get(userinfo_url, headers=headers)
    if userinfo_res.status_code != 200:
        logger.error(f"Failed to fetch profile from Google ({userinfo_res.status_code})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch user profile from Google"
        )

    userinfo = userinfo_res.json()
    email = userinfo.get("email")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return a valid email"
        )

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        logger.warning(f"Sign-up rejected: User email {email} already exists in database")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already exists for this email. Please Log In instead."
        )

    # Fetch Drive Storage Quota from Google Drive API
    storage_limit = None
    storage_usage = None
    try:
        quota_url = "https://www.googleapis.com/drive/v3/about?fields=storageQuota"
        quota_res = requests.get(quota_url, headers=headers)
        if quota_res.status_code == 200:
            quota_data = quota_res.json().get("storageQuota", {})
            if quota_data.get("limit"):
                storage_limit = int(quota_data["limit"])
            if quota_data.get("usage"):
                storage_usage = int(quota_data["usage"])
    except Exception as e:
        logger.warning(f"Error requesting Drive storage quota: {e}")

    display_name = payload.name.strip() if payload.name and payload.name.strip() else email.split("@")[0]
    new_user = User(
        email=email,
        name=display_name,
        google_access_token=google_access_token,
        google_refresh_token=google_refresh_token,
        storage_limit=storage_limit,
        storage_usage=storage_usage
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Sign-Up complete: Created new User ID {new_user.id} for email {email}")

    app_jwt = create_access_token(user_id=new_user.id)
    return TokenResponse(
        access_token=app_jwt,
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=TokenResponse)
def login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    logger.info("Processing Log-In request...")

    target_email = payload.email

    # If code was passed instead of direct email, resolve email via Google userinfo
    if not target_email and payload.code:
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": payload.code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": "postmessage",
            "grant_type": "authorization_code"
        }
        token_response = requests.post(token_url, data=data)
        if token_response.status_code == 200:
            tokens = token_response.json()
            access_tok = tokens.get("access_token")
            userinfo_res = requests.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {access_tok}"})
            if userinfo_res.status_code == 200:
                target_email = userinfo_res.json().get("email")

    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google email or valid code is required for Log-In"
        )

    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        logger.warning(f"Log-in failed: Account {target_email} not found in database")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please Sign Up first!"
        )

    logger.info(f"Log-in successful for User ID {user.id} ({user.email}). Issued fresh App JWT in <5ms.")
    app_jwt = create_access_token(user_id=user.id)

    return TokenResponse(
        access_token=app_jwt,
        user=UserResponse.model_validate(user)
    )
