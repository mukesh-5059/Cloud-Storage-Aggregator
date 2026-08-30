import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

# Load .env from backend folder or current working directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

uri = os.getenv("MONGODB_URI")
if not uri:
    print("❌ Error: MONGODB_URI not found in .env")
    exit(1)

try:
    client = MongoClient(uri)
    try:
        db = client.get_default_database()
    except Exception:
        db = None

    if db is None:
        db = client["nodevault"]

    collections = ["users", "rooms", "nodes", "files", "room_members"]
    for col in collections:
        result = db[col].delete_many({})
        print(f"🗑️ Cleared collection '{col}': {result.deleted_count} document(s) deleted.")

    print(f"✅ Database '{db.name}' cleared successfully!")
except Exception as err:
    print(f"❌ Error clearing database: {err}")
