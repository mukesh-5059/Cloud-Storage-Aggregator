import os
import logging
import config

from sqlalchemy import create_engine, event
from sqlalchemy.pool import QueuePool
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

logger = logging.getLogger("database")

db_url = os.environ.get("DATABASE_URL", "")

if db_url.startswith("postgresql://") or db_url.startswith("postgres://") or db_url.startswith("postgresql+psycopg2://"):
    clean_url = db_url.replace("postgres://", "postgresql://", 1)
    if not clean_url.startswith("postgresql+psycopg2://") and not clean_url.startswith("postgresql+asyncpg://"):
        clean_url = clean_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    
    logger.info("Connecting to Neon PostgreSQL Cloud DB")
    engine = create_engine(
        clean_url,
        poolclass=QueuePool,
        pool_size=15,
        max_overflow=25,
        pool_pre_ping=True,
        pool_recycle=60
    )

else:
    local_url = db_url or "sqlite:///./app.db"
    logger.info(f"Connecting to local SQLite DB: {local_url}")
    engine = create_engine(
        local_url,
        connect_args={"check_same_thread": False},
        poolclass=QueuePool,
        pool_size=20,
        max_overflow=30,
        pool_pre_ping=True,
        pool_recycle=300
    )

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if engine.dialect.name == "sqlite":
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
