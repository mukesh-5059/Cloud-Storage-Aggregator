import os
import logging
import config  # Ensures .env variables are loaded into os.environ
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

logger = logging.getLogger("database")

turso_url = os.environ.get("TURSO_DATABASE_URL", os.environ.get("DATABASE_URL", ""))
turso_token = os.environ.get("TURSO_AUTH_TOKEN", "")

if turso_url and (turso_url.startswith("libsql://") or turso_url.startswith("sqlite+libsql://")):
    clean_url = turso_url.replace("sqlite+libsql://", "").replace("libsql://", "").replace("https://", "")
    sep = "&" if "?" in clean_url else "?"
    db_url = f"sqlite+libsql://{clean_url}{sep}secure=true"
    logger.info(f"Connecting to Turso Cloud DB: {clean_url}")
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False, "auth_token": turso_token}
    )
else:
    db_url = os.environ.get("DATABASE_URL", "sqlite:///./app.db")
    logger.info(f"Connecting to local SQLite DB: {db_url}")
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )



@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
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

