from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import init_db, close_db, run_migrations
from core.exceptions import AppException
from core.rate_limit import RateLimitMiddleware
from core.logging import setup_logging, RequestLoggingMiddleware
from routers import sessions, files, search, documents, memory, tasks, learning


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await run_migrations()
    yield
    await close_db()


app = FastAPI(title="OmniMind-Agent", version="1.2.0", lifespan=lifespan)

setup_logging()

app.add_middleware(RateLimitMiddleware, requests=60, window=60)
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.2.0"}


app.include_router(sessions.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(memory.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(learning.router, prefix="/api/v1")
