"""Shared-passcode gate for the public hackathon deployment.

Not cryptographically strong auth -- there is no per-user identity, just one
shared secret. The goal is narrow: stop a stranger with the public link from
spending real Snowflake/Cortex credits, while letting anyone view the app.
Disabled entirely when settings.demo_passcode is unset, which is the default
for local dev and every test in this repo.
"""

import hashlib
import hmac
import time

from app.config import settings

_TOKEN_TTL_SECONDS = 12 * 60 * 60  # comfortably covers one judging session


def _sign(expires_at: int) -> str:
    return hmac.new(settings.demo_passcode.encode(), str(expires_at).encode(), hashlib.sha256).hexdigest()


def is_enabled() -> bool:
    return bool(settings.demo_passcode)


def check_passcode(passcode: str) -> bool:
    return hmac.compare_digest(passcode, settings.demo_passcode)


def create_token() -> tuple[str, int]:
    """Returns (token, expires_at_epoch_seconds)."""
    expires_at = int(time.time()) + _TOKEN_TTL_SECONDS
    return f"{expires_at}.{_sign(expires_at)}", expires_at


def verify_token(token: str) -> bool:
    try:
        expires_at_str, signature = token.split(".", 1)
        expires_at = int(expires_at_str)
    except ValueError:
        return False
    if expires_at < int(time.time()):
        return False
    return hmac.compare_digest(signature, _sign(expires_at))
