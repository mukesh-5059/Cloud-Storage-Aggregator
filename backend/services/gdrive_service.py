import logging
import json
import httpx
from typing import Optional
from sqlalchemy.orm import Session

from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
from database import SessionLocal
from models import User

logger = logging.getLogger("gdrive_service")

# Module-level client holder, initialized during app lifespan
http_client: Optional[httpx.AsyncClient] = None

def get_client() -> httpx.AsyncClient:
    """Returns the shared httpx.AsyncClient instance or creates a fallback if lifespan is uninitialized."""
    global http_client
    if http_client is None or http_client.is_closed:
        http_client = httpx.AsyncClient(timeout=30.0)
    return http_client

async def get_fresh_google_access_token(user: User, db: Session, force_refresh: bool = False) -> Optional[str]:
    """Retrieves or refreshes Google access token for a user using the database session."""
    if not user:
        return None
    if user.google_access_token and not force_refresh:
        return user.google_access_token

    if user.google_refresh_token:
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": user.google_refresh_token,
            "grant_type": "refresh_token"
        }
        try:
            logger.info(f"Refreshing Google access token for User ID {user.id} (force_refresh={force_refresh})...")
            client = get_client()
            res = await client.post(token_url, data=data)
            if res.status_code == 200:
                tokens = res.json()
                new_acc_token = tokens.get("access_token")
                if new_acc_token:
                    user.google_access_token = new_acc_token
                    db.commit()
                    logger.info(f"Successfully refreshed Google access token for User ID {user.id}")
                    return new_acc_token
            else:
                logger.error(f"Google Token Refresh API failed for User ID {user.id} ({res.status_code}): {res.text}")
        except Exception as e:
            logger.warning(f"Failed to refresh Google access token for User ID {user.id}: {e}")

    return user.google_access_token if not force_refresh else None

async def create_room_folder(access_token: str, folder_name: str, user: Optional[User] = None, db: Optional[Session] = None) -> str:
    """Creates a physical folder in Google Drive and returns its ID."""
    folder_metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder"
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    client = get_client()
    res = await client.post(
        "https://www.googleapis.com/drive/v3/files",
        headers=headers,
        json=folder_metadata
    )
    if res.status_code == 401 and user and db:
        logger.info(f"create_room_folder received 401. Refreshing token for User ID {user.id}...")
        fresh_token = await get_fresh_google_access_token(user, db, force_refresh=True)
        if fresh_token:
            headers["Authorization"] = f"Bearer {fresh_token}"
            res = await client.post(
                "https://www.googleapis.com/drive/v3/files",
                headers=headers,
                json=folder_metadata
            )
    if res.status_code == 200:
        return res.json().get("id", "")
    else:
        raise Exception(f"Google Drive folder creation status {res.status_code}: {res.text}")

async def set_file_permission(access_token: str, gdrive_file_id: str) -> bool:
    """Sets 'anyone/reader' permission on a Google Drive file."""
    perm_url = f"https://www.googleapis.com/drive/v3/files/{gdrive_file_id}/permissions"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    perm_data = {"role": "reader", "type": "anyone"}
    client = get_client()
    res = await client.post(perm_url, headers=headers, json=perm_data)
    return res.status_code in (200, 201)

async def set_file_permission_background(gdrive_file_id: str, storage_user_id: int):
    """Sets 'anyone/reader' permission in a BackgroundTask with an isolated DB session."""
    if not storage_user_id or not gdrive_file_id:
        return
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == storage_user_id).first()
        if not user:
            return
        access_token = await get_fresh_google_access_token(user, db)
        if not access_token:
            return

        success = await set_file_permission(access_token, gdrive_file_id)
        if not success:
            fresh_token = await get_fresh_google_access_token(user, db, force_refresh=True)
            if fresh_token:
                await set_file_permission(fresh_token, gdrive_file_id)
    except Exception as e:
        logger.warning(f"Could not set 'anyone/reader' permission on Drive file {gdrive_file_id}: {e}")
    finally:
        db.close()

async def download_file_content(access_token: str, gdrive_file_id: str, user: Optional[User] = None, db: Optional[Session] = None) -> Optional[bytes]:
    """Downloads raw file bytes from Google Drive API."""
    url = f"https://www.googleapis.com/drive/v3/files/{gdrive_file_id}?alt=media"
    headers = {"Authorization": f"Bearer {access_token}"}
    client = get_client()
    res = await client.get(url, headers=headers)
    if res.status_code == 401 and user and db:
        logger.info(f"download_file_content received 401. Refreshing token for User ID {user.id}...")
        fresh_token = await get_fresh_google_access_token(user, db, force_refresh=True)
        if fresh_token:
            headers["Authorization"] = f"Bearer {fresh_token}"
            res = await client.get(url, headers=headers)
    if res.status_code == 200:
        return res.content
    return None

async def upload_file_multipart(access_token: str, metadata: dict, file_name: str, content: bytes, mime_type: str, user: Optional[User] = None, db: Optional[Session] = None) -> Optional[str]:
    """Uploads file content using Google Drive multipart upload API and returns new file ID."""
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
    headers = {"Authorization": f"Bearer {access_token}"}
    files_payload = {
        "data": ("metadata", json.dumps(metadata), "application/json; charset=UTF-8"),
        "file": (file_name, content, mime_type or "application/octet-stream")
    }
    client = get_client()
    res = await client.post(url, headers=headers, files=files_payload)
    if res.status_code == 401 and user and db:
        logger.info(f"upload_file_multipart received 401. Refreshing token for User ID {user.id}...")
        fresh_token = await get_fresh_google_access_token(user, db, force_refresh=True)
        if fresh_token:
            headers["Authorization"] = f"Bearer {fresh_token}"
            res = await client.post(url, headers=headers, files=files_payload)
    if res.status_code == 200:
        return res.json().get("id")
    return None

async def copy_file(target_access_token: str, source_file_id: str, metadata: dict, user: Optional[User] = None, db: Optional[Session] = None) -> Optional[str]:
    """Clones a Google Drive file server-side to a new owner/folder using Google Drive API."""
    url = f"https://www.googleapis.com/drive/v3/files/{source_file_id}/copy"
    headers = {"Authorization": f"Bearer {target_access_token}", "Content-Type": "application/json"}
    client = get_client()
    res = await client.post(url, headers=headers, json=metadata)
    if res.status_code == 401 and user and db:
        logger.info(f"copy_file received 401. Refreshing token for User ID {user.id}...")
        fresh_token = await get_fresh_google_access_token(user, db, force_refresh=True)
        if fresh_token:
            headers["Authorization"] = f"Bearer {fresh_token}"
            res = await client.post(url, headers=headers, json=metadata)
    if res.status_code == 200:
        return res.json().get("id")
    return None


async def delete_file(access_token: str, gdrive_file_id: str, user: Optional[User] = None, db: Optional[Session] = None) -> bool:
    """Deletes a file from Google Drive with automatic token refresh on 401 Unauthorized."""
    url = f"https://www.googleapis.com/drive/v3/files/{gdrive_file_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    client = get_client()
    res = await client.delete(url, headers=headers)
    if res.status_code == 401 and user and db:
        logger.info(f"Received 401 Unauthorized from Drive for file {gdrive_file_id}. Refreshing token for User ID {user.id}...")
        fresh_token = await get_fresh_google_access_token(user, db, force_refresh=True)
        if fresh_token:
            headers["Authorization"] = f"Bearer {fresh_token}"
            res = await client.delete(url, headers=headers)
    return res.status_code in (200, 204)


async def revoke_oauth_token(token: str) -> bool:
    """Revokes a Google OAuth access or refresh token."""
    url = f"https://oauth2.googleapis.com/revoke?token={token}"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    client = get_client()
    res = await client.post(url, headers=headers)
    return res.status_code == 200
