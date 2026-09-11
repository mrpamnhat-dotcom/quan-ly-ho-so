import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

SESSION_HOURS = int(os.getenv('ADMIN_SESSION_HOURS', '12'))
PBKDF2_ITERATIONS = 310_000


def hash_password(password: str, salt: bytes | None = None) -> str:
    if salt is None:
        salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PBKDF2_ITERATIONS)
    return f'pbkdf2_sha256${PBKDF2_ITERATIONS}${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}'


def verify_password(password: str, encoded: str) -> bool:
    try:
        algo, iterations, salt_b64, digest_b64 = encoded.split('$')
        if algo != 'pbkdf2_sha256':
            return False
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(digest_b64.encode())
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def session_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
