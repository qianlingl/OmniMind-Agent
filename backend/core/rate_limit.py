import time
import threading
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitStore:
    _lock = threading.Lock()
    _store: dict[str, tuple[int, float]] = {}

    @classmethod
    def get_cls(cls) -> dict[str, tuple[int, float]]:
        with cls._lock:
            return cls._store

    @classmethod
    def hit(cls, key: str, limit: int, window: int) -> bool:
        now = time.time()
        with cls._lock:
            stored = cls._store.get(key)
            if stored is None or now - stored[1] > window:
                cls._store[key] = (1, now)
                return True
            count, start = stored
            if count >= limit:
                return False
            cls._store[key] = (count + 1, start)
            return True

    @classmethod
    def cleanup(cls, window: int):
        now = time.time()
        with cls._lock:
            cls._store = {
                k: v for k, v in cls._store.items() if now - v[1] <= window
            }


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests: int = 60, window: int = 60):
        super().__init__(app)
        self.requests = requests
        self.window = window

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        api_key = request.headers.get("x-api-key", "")
        key = f"{client_ip}:{api_key}"

        if not RateLimitStore.hit(key, self.requests, self.window):
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded. Please slow down."},
            )

        return await call_next(request)
