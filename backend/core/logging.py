import logging
import json
import sys
import uuid
import re
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get(),
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(level: str = "INFO"):
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    for h in root.handlers[:]:
        root.removeHandler(h)

    # Console handler with JSON output
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(JSONFormatter())
    root.addHandler(ch)


def mask_sensitive(text: str) -> str:
    patterns = [
        (r'(api[_-]?key["\']?\s*[:=]\s*["\']?)([^\s"\']+)', r"\1***REDACTED***"),
        (r'(bearer\s+)([^\s]+)', r"\1***REDACTED***"),
        (r'(password["\']?\s*[:=]\s*["\']?)([^\s"\']+)', r"\1***REDACTED***"),
    ]
    for pattern, repl in patterns:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        req_id = str(uuid.uuid4())[:8]
        request_id_var.set(req_id)

        logger = logging.getLogger("omnimind.request")
        start = request.scope.get("start_time")

        logger.info(
            f"{request.method} {request.url.path} — started",
            extra={"method": request.method, "path": request.url.path, "client": request.client.host if request.client else "unknown"},
        )

        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            logger.error(
                f"{request.method} {request.url.path} — error: {exc}",
                extra={"method": request.method, "path": request.url.path, "error": str(exc)},
            )
            raise
