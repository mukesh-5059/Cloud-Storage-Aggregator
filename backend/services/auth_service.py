import logging
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
from models import User
from schemas import GoogleSignUpRequest, GoogleLoginRequest, TokenResponse, UserResponse
from auth_utils import create_access_token
from services import gdrive_service

logger = logging.getLogger("auth_service")

async def signup_google_user(payload: GoogleSignUpRequest, db: Session) -> TokenResponse:
    """Handles Google OAuth code exchange, profile fetching, quota check, and new user creation."""
    logger.info("Processing Sign-Up request with Google authorization code...")
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": payload.code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": "postmessage",
        "grant_type": "authorization_code"
    }

    client = gdrive_service.get_client()
    try:
        token_response = await client.post(token_url, data=data)
    except httpx.RequestError as e:
        logger.error(f"Google Token Exchange connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Connection to Google OAuth server timed out: {e}"
        )

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
    try:
        userinfo_res = await client.get(userinfo_url, headers=headers)
    except httpx.RequestError as e:
        logger.error(f"Failed to fetch profile from Google due to network timeout: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Google profile request timed out"
        )

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

    storage_limit = None
    storage_usage = None
    try:
        quota_url = "https://www.googleapis.com/drive/v3/about?fields=storageQuota"
        quota_res = await client.get(quota_url, headers=headers)
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

async def login_google_user(payload: GoogleLoginRequest, db: Session) -> TokenResponse:
    """Handles Google login verification via ID Token, Code Exchange, or Access Token."""
    logger.info("Processing Log-In request...")
    target_email = None
    fresh_access_token = None
    fresh_refresh_token = None

    client = gdrive_service.get_client()

    # 1. Option 1: ID Token Verification
    if payload.id_token:
        try:
            id_info = google_id_token.verify_oauth2_token(
                payload.id_token,
                google_requests.Request(),
                GOOGLE_CLIENT_ID
            )
            target_email = id_info.get("email")
            logger.info(f"Verified Google ID token for email: {target_email}")
        except Exception as e:
            logger.error(f"Failed to verify Google ID Token: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Google ID Token: {e}"
            )

    # 2. Option 2: Authorization Code Exchange
    elif payload.code:
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": payload.code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": "postmessage",
            "grant_type": "authorization_code"
        }
        try:
            token_response = await client.post(token_url, data=data)
            if token_response.status_code == 200:
                tokens = token_response.json()
                fresh_access_token = tokens.get("access_token")
                fresh_refresh_token = tokens.get("refresh_token")
                userinfo_res = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {fresh_access_token}"}
                )
                if userinfo_res.status_code == 200:
                    target_email = userinfo_res.json().get("email")
                else:
                    logger.error(f"Google userinfo request failed during login code exchange ({userinfo_res.status_code}): {userinfo_res.text}")
            else:
                logger.error(f"Google token exchange failed during login code exchange ({token_response.status_code}): {token_response.text}")
        except httpx.RequestError as e:
            logger.warning(f"Authorization code exchange failed/timed out: {e}")

    # 3. Option 3: Direct Access Token Verification via Google UserInfo API
    elif payload.access_token:
        try:
            fresh_access_token = payload.access_token
            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.access_token}"}
            )
            if userinfo_res.status_code == 200:
                target_email = userinfo_res.json().get("email")
                logger.info(f"Verified Google access token server-side for email: {target_email}")
            else:
                logger.error(f"Google userinfo validation failed with status {userinfo_res.status_code}")
        except httpx.RequestError as e:
            logger.warning(f"Google userinfo validation request timed out: {e}")

    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid Google ID token, authorization code, or access token is required for Log-In"
        )

    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        logger.warning(f"Log-in failed: Account {target_email} not found in database")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please Sign Up first!"
        )

    if fresh_access_token:
        user.google_access_token = fresh_access_token
    if fresh_refresh_token:
        user.google_refresh_token = fresh_refresh_token
    if fresh_access_token or fresh_refresh_token:
        db.commit()
        db.refresh(user)

    logger.info(f"Log-in successful for User ID {user.id} ({user.email}). Issued fresh App JWT.")
    app_jwt = create_access_token(user_id=user.id)
    return TokenResponse(
        access_token=app_jwt,
        user=UserResponse.model_validate(user)
    )
