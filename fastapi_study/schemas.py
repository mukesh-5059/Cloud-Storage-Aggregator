from pydantic import BaseModel, EmailStr
from typing import Optional, List

class GoogleSignUpRequest(BaseModel):
    code: str
    name: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    code: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    storage_limit: Optional[int] = None
    storage_usage: Optional[int] = None

    class Config:
        from_attributes = True

class UserSelfResponse(BaseModel):
    id: int
    email: str
    name: str
    google_access_token: Optional[str] = None
    google_refresh_token: Optional[str] = None
    storage_limit: Optional[int] = None
    storage_usage: Optional[int] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class RoomCreate(BaseModel):
    name: str
    password: str

class RoomJoin(BaseModel):
    password: str

class RoomResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
