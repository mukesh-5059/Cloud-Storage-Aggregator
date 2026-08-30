import os
import random
import string
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from bson import ObjectId

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
    rooms_collection = db["rooms"]
    room_members_collection = db["room_members"]
    files_collection = db["files"]
    print("✅ Connected to MongoDB Atlas successfully.")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB Atlas: {e}")
    db = None
    users_collection = None
    rooms_collection = None
    room_members_collection = None
    files_collection = None

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


class CreateRoomRequest(BaseModel):
    name: str
    password: str


class JoinRoomRequest(BaseModel):
    room_id: str
    password: str


class ContributeStorageRequest(BaseModel):
    room_id: str
    quota_gb: float


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def generate_room_id() -> str:
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=6))
    return f"RM-{code}"


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


def get_current_user_doc(authorization: Optional[str] = Header(None)) -> dict:
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
    return user


@app.get("/")
def read_root():
    return {
        "message": "RoomVault API is running",
        "db": db.name if db is not None else "disconnected"
    }


@app.post("/api/auth/login")
async def google_login(payload: GoogleAuthRequest):
    if not payload.code and not payload.access_token:
        raise HTTPException(status_code=400, detail="Either 'code' or 'access_token' must be provided.")

    access_token = payload.access_token
    email = None
    name = ""
    picture = ""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
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

    if users_collection is None:
        raise HTTPException(status_code=500, detail="Database collection unavailable")

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
def get_current_user(user: dict = Depends(get_current_user_doc)):
    return {
        "user": {
            "id": str(user["_id"]),
            "email": user.get("email"),
            "name": user.get("name"),
            "picture": user.get("picture"),
            "storage_contributed": user.get("storage_contributed", False)
        }
    }


# ==========================================
# ROOM MANAGEMENT ENDPOINTS (Normalized MongoDB Schema)
# ==========================================

@app.post("/api/rooms/create")
def create_room(payload: CreateRoomRequest, user: dict = Depends(get_current_user_doc)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Room name cannot be empty")
    if not payload.password.strip():
        raise HTTPException(status_code=400, detail="Room password cannot be empty")

    user_id = str(user["_id"])

    # Generate unique room_id
    while True:
        room_id = generate_room_id()
        if not rooms_collection.find_one({"room_id": room_id}):
            break

    room_doc = {
        "room_id": room_id,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "owner_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    rooms_collection.insert_one(room_doc)

    # Store normalized room membership (only user_id, room_id, role, contributed_storage_gb)
    room_members_collection.insert_one({
        "room_id": room_id,
        "user_id": user_id,
        "role": "owner",
        "contributed_storage_gb": 0.0,
        "joined_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "message": "Room created successfully",
        "room": {
            "room_id": room_id,
            "name": room_doc["name"],
            "owner_id": user_id,
            "role": "owner"
        }
    }


@app.post("/api/rooms/join")
def join_room(payload: JoinRoomRequest, user: dict = Depends(get_current_user_doc)):
    room_id = payload.room_id.strip().upper()
    room = rooms_collection.find_one({"room_id": room_id})

    if not room:
        raise HTTPException(status_code=404, detail="Room not found. Check Room ID.")

    if hash_password(payload.password) != room["password_hash"]:
        raise HTTPException(status_code=401, detail="Incorrect room password.")

    user_id = str(user["_id"])
    existing_membership = room_members_collection.find_one({"room_id": room_id, "user_id": user_id})

    if not existing_membership:
        room_members_collection.insert_one({
            "room_id": room_id,
            "user_id": user_id,
            "role": "member",
            "contributed_storage_gb": 0.0,
            "joined_at": datetime.now(timezone.utc).isoformat()
        })

    return {
        "message": "Joined room successfully",
        "room": {
            "room_id": room_id,
            "name": room["name"],
            "owner_id": room["owner_id"],
            "role": "owner" if room["owner_id"] == user_id else "member"
        }
    }


@app.get("/api/rooms/my-rooms")
def get_my_rooms(user: dict = Depends(get_current_user_doc)):
    user_id = str(user["_id"])
    memberships = list(room_members_collection.find({"user_id": user_id}))

    my_rooms = []
    for m in memberships:
        room = rooms_collection.find_one({"room_id": m["room_id"]})
        if room:
            member_count = room_members_collection.count_documents({"room_id": m["room_id"]})
            all_members = list(room_members_collection.find({"room_id": m["room_id"]}))
            total_allocated_gb = sum(mem.get("contributed_storage_gb", 0.0) for mem in all_members)

            owner_doc = None
            try:
                owner_doc = users_collection.find_one({"_id": ObjectId(room["owner_id"])})
            except Exception:
                owner_doc = users_collection.find_one({"_id": room["owner_id"]})

            my_rooms.append({
                "room_id": room["room_id"],
                "name": room["name"],
                "owner_id": room["owner_id"],
                "owner_name": owner_doc.get("name", "Owner") if owner_doc else "Owner",
                "is_owner": room["owner_id"] == user_id,
                "role": m.get("role", "member"),
                "member_count": member_count,
                "total_allocated_gb": total_allocated_gb,
                "contributed_storage_gb": m.get("contributed_storage_gb", 0.0)
            })

    return {"rooms": my_rooms}


@app.get("/api/rooms/{room_id}")
def get_room_details(room_id: str, user: dict = Depends(get_current_user_doc)):
    room_id = room_id.upper()
    room = rooms_collection.find_one({"room_id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    user_id = str(user["_id"])
    membership = room_members_collection.find_one({"room_id": room_id, "user_id": user_id})
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this room")

    members = list(room_members_collection.find({"room_id": room_id}))
    member_list = []
    total_allocated_gb = 0.0

    for m in members:
        contributed = m.get("contributed_storage_gb", 0.0)
        total_allocated_gb += contributed

        # Fetch user document dynamically from users_collection using user_id
        u_doc = None
        try:
            u_doc = users_collection.find_one({"_id": ObjectId(m["user_id"])})
        except Exception:
            u_doc = users_collection.find_one({"_id": m["user_id"]})

        if not u_doc and "user_email" in m:
            u_doc = users_collection.find_one({"email": m["user_email"]}) or {}

        u_doc = u_doc or {}

        member_list.append({
            "user_id": m["user_id"],
            "name": u_doc.get("name", "User"),
            "email": u_doc.get("email", ""),
            "picture": u_doc.get("picture", ""),
            "role": m.get("role", "member"),
            "contributed_storage_gb": contributed
        })

    demo_files = [
        {"id": "1", "name": "android_studio", "is_folder": True, "owner": "me", "owner_initials": "Mk", "date_modified": "Dec 3, 2025", "size": "—"},
        {"id": "2", "name": "customizations", "is_folder": True, "owner": "me", "owner_initials": "Mk", "date_modified": "Dec 3, 2025", "size": "—"},
        {"id": "3", "name": "Downloads", "is_folder": True, "owner": "me", "owner_initials": "Mk", "date_modified": "Dec 3, 2025", "size": "—"},
        {"id": "4", "name": "Games", "is_folder": True, "owner": "me", "owner_initials": "Mk", "date_modified": "Dec 3, 2025", "size": "—"},
        {"id": "5", "name": "Project Kavach Proposal.pdf", "is_folder": False, "owner": "me", "owner_initials": "Mk", "date_modified": "Jun 27, 2025", "size": "4 KB"},
    ]

    return {
        "room": {
            "room_id": room["room_id"],
            "name": room["name"],
            "owner_id": room["owner_id"],
            "is_owner": room["owner_id"] == user_id,
            "total_allocated_gb": total_allocated_gb,
            "members": member_list,
            "files": demo_files
        }
    }


@app.post("/api/rooms/contribute-storage")
def contribute_storage(payload: ContributeStorageRequest, user: dict = Depends(get_current_user_doc)):
    user_id = str(user["_id"])
    room_id = payload.room_id.upper()

    membership = room_members_collection.find_one({"room_id": room_id, "user_id": user_id})
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this room")

    room_members_collection.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {"contributed_storage_gb": float(payload.quota_gb)}}
    )

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"storage_contributed": True}}
    )

    return {"message": "Storage quota updated successfully", "quota_gb": payload.quota_gb}
