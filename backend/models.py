from sqlalchemy import Column, Integer, BigInteger, String, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class UserRoom(Base):
    __tablename__ = "user_rooms"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), primary_key=True, index=True)
    allocated_bytes = Column(BigInteger, default=0, nullable=False)
    used_bytes = Column(BigInteger, default=0, nullable=False)
    files_hosted_count = Column(Integer, default=0, nullable=False)
    gdrive_folder_id = Column(String, nullable=True)

    user = relationship("User", back_populates="room_memberships")
    room = relationship("Room", back_populates="user_memberships")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    google_access_token = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)
    storage_limit = Column(BigInteger, nullable=True)
    storage_usage = Column(BigInteger, nullable=True)

    created_rooms = relationship("Room", back_populates="owner")
    room_memberships = relationship("UserRoom", back_populates="user", cascade="all, delete-orphan")
    uploaded_files = relationship("FileItem", foreign_keys="FileItem.uploader_id", back_populates="uploader")
    hosted_files = relationship("FileItem", foreign_keys="FileItem.storage_user_id", back_populates="storage_user")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="created_rooms")
    user_memberships = relationship("UserRoom", back_populates="room", cascade="all, delete-orphan")
    files = relationship("FileItem", back_populates="room", cascade="all, delete-orphan")

class FileItem(Base):
    __tablename__ = "file_items"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("file_items.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    is_folder = Column(Boolean, default=False, nullable=False)
    size_bytes = Column(BigInteger, default=0, nullable=False)
    mime_type = Column(String, nullable=True)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    storage_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    gdrive_file_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    room = relationship("Room", back_populates="files")
    parent = relationship("FileItem", remote_side=[id], backref="children")
    uploader = relationship("User", foreign_keys=[uploader_id], back_populates="uploaded_files")
    storage_user = relationship("User", foreign_keys=[storage_user_id], back_populates="hosted_files")

    __table_args__ = (
        Index("idx_file_items_room_parent", "room_id", "parent_id"),
    )



