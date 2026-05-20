import hashlib
import os
from fastapi import Header, HTTPException, Request
from database import async_session
from core.exceptions import Unauthorized, PermissionDenied, AppException
from config import settings


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def verify_api_key(x_api_key: str = Header(default="", alias="X-API-Key")):
    if not x_api_key:
        require = os.environ.get("REQUIRE_API_KEY", "").lower()
        if require in ("", "0", "false", "no"):
            return True
        raise HTTPException(status_code=401, detail="API key required")
    if settings.api_key_hash:
        key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
        expected = settings.api_key_hash.replace("sha256$", "")
        if key_hash != expected:
            raise HTTPException(status_code=401, detail="Invalid API key")
    return True
