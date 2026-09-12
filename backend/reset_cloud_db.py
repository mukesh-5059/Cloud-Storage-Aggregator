import sys
import os
import argparse
import logging
from sqlalchemy import text

# Ensure backend directory is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import FileItem, UserRoom, Room, User

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("reset_cloud_db")

def clear_cloud_db(force: bool = False):
    """Clears all records from all database tables in the configured database (Neon PostgreSQL / SQLite)."""
    print("=" * 60)
    print("WARNING: You are about to wipe ALL data in the database!")
    print(f"Engine URL: {engine.url}")
    print("=" * 60)

    if not force:
        confirm = input("Are you sure you want to delete all users, rooms, and files? (type 'YES' to proceed): ")
        if confirm.strip() != "YES":
            print("Aborted. No data was deleted.")
            return

    db = SessionLocal()
    try:
        logger.info("Clearing file_items...")
        file_count = db.query(FileItem).delete()
        
        logger.info("Clearing user_rooms...")
        membership_count = db.query(UserRoom).delete()
        
        logger.info("Clearing rooms...")
        room_count = db.query(Room).delete()
        
        logger.info("Clearing users...")
        user_count = db.query(User).delete()

        db.commit()

        print("\nDatabase reset complete successfully!")
        print(f"  - Deleted {file_count} file items")
        print(f"  - Deleted {membership_count} room memberships")
        print(f"  - Deleted {room_count} rooms")
        print(f"  - Deleted {user_count} users\n")
    except Exception as e:
        db.rollback()
        logger.error(f"Error resetting database: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset/wipe all data in the cloud database.")
    parser.add_argument("-y", "--yes", action="store_true", help="Bypass confirmation prompt")
    args = parser.parse_args()

    clear_cloud_db(force=args.yes)
