import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

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

    db_name = db.name
    client.drop_database(db_name)
    print(f"🔥 Demolished entire database '{db_name}' from MongoDB Atlas!")
except Exception as err:
    print(f"❌ Error demolishing database: {err}")
