from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

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
    allocated_bytes: Optional[int] = 0
    used_bytes: Optional[int] = 0
    files_hosted_count: Optional[int] = 0

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
    owner_id: int

    class Config:
        from_attributes = True

class StorageContributeRequest(BaseModel):
    allocated_bytes: int

class ContributionResponse(BaseModel):
    room_id: int
    user_id: int
    allocated_bytes: int
    used_bytes: int
    gdrive_folder_id: Optional[str] = None

    class Config:
        from_attributes = True

class FolderCreateRequest(BaseModel):
    name: str
    parent_id: Optional[int] = None

class FileMoveRequest(BaseModel):
    new_parent_id: Optional[int] = None

class FileItemResponse(BaseModel):
    id: int
    room_id: int
    parent_id: Optional[int] = None
    name: str
    is_folder: bool
    size_bytes: int
    mime_type: Optional[str] = None
    uploader_id: Optional[int] = None
    storage_user_id: Optional[int] = None
    uploader_name: Optional[str] = None
    host_name: Optional[str] = None
    gdrive_file_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UploadIntentRequest(BaseModel):
    name: str
    size_bytes: int
    mime_type: Optional[str] = "application/octet-stream"
    parent_id: Optional[int] = None

class UploadIntentResponse(BaseModel):
    upload_url: str
    storage_user_id: int
    storage_user_name: str

class UploadCompleteRequest(BaseModel):
    gdrive_file_id: str
    name: str
    size_bytes: int
    mime_type: Optional[str] = "application/octet-stream"
    parent_id: Optional[int] = None
    storage_user_id: int

class RoomDeletionPreview(BaseModel):
    room_id: int
    room_name: str
    migratable_count: int
    migratable_bytes: int
    cascaded_count: int
    cascaded_bytes: int
    ownership_transferred_to: Optional[str] = None
    room_deleted_as_sole_member: bool = False

class AccountDeletionPreviewResponse(BaseModel):
    total_hosted_files: int
    total_hosted_bytes: int
    migratable_files_count: int
    migratable_bytes: int
    cascaded_files_count: int
    cascaded_bytes: int
    rooms_breakdown: List[RoomDeletionPreview]



