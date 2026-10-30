import base64
import hashlib
import hmac
import secrets
import struct
import time
import urllib.parse

def generate_totp_secret() -> str:
    raw = secrets.token_bytes(20)
    return base64.b32encode(raw).decode("utf-8").replace("=", "")

def get_totp_uri(secret: str, account_name: str, issuer: str = "GatherAround") -> str:
    encoded_issuer = urllib.parse.quote(issuer)
    encoded_account = urllib.parse.quote(account_name)
    return f"otpauth://totp/{encoded_issuer}:{encoded_account}?secret={secret}&issuer={encoded_issuer}&algorithm=SHA1&digits=6&period=30"

def get_current_totp(secret: str, interval: int = 30) -> str:
    pad_len = (8 - (len(secret) % 8)) % 8
    key = base64.b32decode(secret + ("=" * pad_len), casefold=True)
    counter = int(time.time() // interval)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset:offset+4])[0] & 0x7FFFFFFF) % 1000000
    return f"{code:06d}"

def verify_totp(secret: str, token: str, window: int = 1, interval: int = 30) -> bool:
    if not token or len(token) != 6 or not token.isdigit():
        return False
    pad_len = (8 - (len(secret) % 8)) % 8
    try:
        key = base64.b32decode(secret + ("=" * pad_len), casefold=True)
    except Exception:
        return False

    current_step = int(time.time() // interval)
    for i in range(-window, window + 1):
        msg = struct.pack(">Q", current_step + i)
        digest = hmac.new(key, msg, hashlib.sha1).digest()
        offset = digest[-1] & 0x0F
        code = (struct.unpack(">I", digest[offset:offset+4])[0] & 0x7FFFFFFF) % 1000000
        if f"{code:06d}" == token:
            return True
    return False
