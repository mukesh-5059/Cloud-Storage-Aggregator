import os
import json
import logging

logger = logging.getLogger("config")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")
CLIENT_CREDENTIALS_FILE = os.path.join(os.path.dirname(BASE_DIR), "client_with_gdrive.json")

if os.path.exists(ENV_FILE):
    try:
        with open(ENV_FILE, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())
    except Exception as e:
        logger.warning(f"Could not load .env file: {e}")

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")

if os.path.exists(CLIENT_CREDENTIALS_FILE):
    try:
        with open(CLIENT_CREDENTIALS_FILE, "r") as f:
            creds = json.load(f).get("web", {})
            GOOGLE_CLIENT_ID = creds.get("client_id", GOOGLE_CLIENT_ID)
            GOOGLE_CLIENT_SECRET = creds.get("client_secret", GOOGLE_CLIENT_SECRET)
    except Exception as e:
        logger.warning(f"Failed to load client_with_gdrive.json: {e}")

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev_secret_key_change_in_production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
