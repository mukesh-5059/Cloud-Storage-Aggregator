import base64
import os
import logging
from cryptography.fernet import Fernet, InvalidToken
from config import JWT_SECRET_KEY

logger = logging.getLogger("crypto_utils")

def _get_fernet_key() -> bytes:
    raw_key = os.environ.get("DB_ENCRYPTION_KEY", JWT_SECRET_KEY)
    key_bytes = raw_key.encode("utf-8")
    if len(key_bytes) < 32:
        key_bytes = key_bytes.ljust(32, b"0")
    else:
        key_bytes = key_bytes[:32]
    return base64.urlsafe_b64encode(key_bytes)

_fernet = Fernet(_get_fernet_key())

def encrypt_token(plain_text: str | None) -> str | None:
    if not plain_text:
        return None
    if plain_text.startswith("gAAAAA"):
        return plain_text
    try:
        return _fernet.encrypt(plain_text.encode("utf-8")).decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to encrypt token: {e}")
        raise ValueError(f"Encryption failed: {e}")


from sqlalchemy import TypeDecorator, String

def decrypt_token(cipher_text: str | None) -> str | None:
    if not cipher_text:
        return None
    if not isinstance(cipher_text, str) or not cipher_text.startswith("gAAAAA"):
        return cipher_text
    try:
        return _fernet.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        logger.warning("Invalid token format during decryption; returning raw text")
        return cipher_text
    except Exception as e:
        logger.error(f"Failed to decrypt token: {e}")
        return cipher_text

class EncryptedString(TypeDecorator):
    """SQLAlchemy TypeDecorator that encrypts strings at rest in DB and decrypts on load."""
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_token(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt_token(value)
