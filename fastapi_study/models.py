from sqlalchemy import Column, Integer, BigInteger, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base

user_rooms = Table(
    "user_rooms",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("room_id", Integer, ForeignKey("rooms.id"), primary_key=True)
)

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
    joined_rooms = relationship("Room", secondary=user_rooms, back_populates="members")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="created_rooms")
    members = relationship("User", secondary=user_rooms, back_populates="joined_rooms")
