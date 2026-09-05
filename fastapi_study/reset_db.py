import sys
from database import engine, Base
import models

def reset_database():
    print("🗑️  Dropping all tables from SQLite database...")
    Base.metadata.drop_all(bind=engine)
    print("✨ Re-creating empty tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database reset complete!")

if __name__ == "__main__":
    reset_database()
