import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient

# Load environment variables from .env file
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
JWT_SECRET = os.getenv("JWT_SECRET", "nodevault_secret_key_change_in_prod")
JWT_ALGORITHM = "HS256"

# Initialize MongoDB Client
try:
    mongo_client = MongoClient(MONGODB_URI)
    try:
        db = mongo_client.get_default_database()
    except Exception:
        db = None

    if db is None:
        db = mongo_client["nodevault"]

    users_collection = db["users"]
    print("✅ Connected to MongoDB Atlas successfully.")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB Atlas: {e}")
    db = None
    users_collection = None

app = FastAPI(title="RoomVault API", version="1.0.0")

# Enable CORS for local Vite frontend & vercel preview/production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GoogleAuthRequest(BaseModel):
    code: Optional[str] = None
    access_token: Optional[str] = None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/")
def read_root():
    return {
        "message": "RoomVault API is running",
        "db": db.name if db is not None else "disconnected"
    }


@app.post("/api/auth/login")
async def google_login(payload: GoogleAuthRequest):
    """Exchanges Google authorization code or uses access_token for user profile, saving user to MongoDB."""
    if not payload.code and not payload.access_token:
        raise HTTPException(status_code=400, detail="Either 'code' or 'access_token' must be provided.")

    access_token = payload.access_token
    email = None
    name = ""
    picture = ""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Exchange auth code for access token if code is provided
            if payload.code:
                if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
                    raise HTTPException(
                        status_code=500,
                        detail="GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured in backend environment."
                    )

                token_url = "https://oauth2.googleapis.com/token"
                token_data = {
                    "code": payload.code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": "postmessage",
                    "grant_type": "authorization_code",
                }

                token_response = await client.post(token_url, data=token_data)

                if token_response.status_code != 200:
                    error_details = (
                        token_response.json()
                        if token_response.headers.get("content-type", "").startswith("application/json")
                        else {}
                    )
                    raise HTTPException(
                        status_code=400,
                        detail=f"Google token exchange failed: {error_details.get('error_description', token_response.text)}"
                    )

                tokens = token_response.json()
                access_token = tokens.get("access_token")

            if not access_token:
                raise HTTPException(status_code=400, detail="Failed to obtain access token from Google.")

            # 2. Retrieve User Profile from Google userinfo API
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if userinfo_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch user profile from Google")

            user_info = userinfo_response.json()
            email = user_info.get("email")
            name = user_info.get("name", "")
            picture = user_info.get("picture", "")

            if not email:
                raise HTTPException(status_code=400, detail="Email not provided by Google account")

    except httpx.ConnectTimeout:
        raise HTTPException(status_code=504, detail="Connection to Google OAuth servers timed out. Please try again.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Network error connecting to Google: {str(exc)}")

    # Check MongoDB collection availability
    if users_collection is None:
        raise HTTPException(status_code=500, detail="Database collection unavailable")

    # 3. Find or Create User in MongoDB
    existing_user = users_collection.find_one({"email": email})

    if not existing_user:
        new_user_doc = {
            "email": email,
            "name": name,
            "picture": picture,
            "storage_contributed": False,
            "drive_refresh_token": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": datetime.now(timezone.utc).isoformat()
        }
        res = users_collection.insert_one(new_user_doc)
        user_id = str(res.inserted_id)
        storage_contributed = False
    else:
        user_id = str(existing_user["_id"])
        storage_contributed = existing_user.get("storage_contributed", False)
        users_collection.update_one(
            {"_id": existing_user["_id"]},
            {"$set": {
                "name": name,
                "picture": picture,
                "last_login": datetime.now(timezone.utc).isoformat()
            }}
        )

    # 4. Generate RoomVault JWT token
    jwt_payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "picture": picture
    }
    auth_token = create_access_token(jwt_payload)

    return {
        "token": auth_token,
        "user": {
            "id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "storage_contributed": storage_contributed
        }
    }


@app.get("/api/auth/me")
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    email = payload.get("email")

    if users_collection is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user": {
            "id": str(user["_id"]),
            "email": user.get("email"),
            "name": user.get("name"),
            "picture": user.get("picture"),
            "storage_contributed": user.get("storage_contributed", False)
        }
    }
