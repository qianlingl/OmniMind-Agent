import hashlib
import os
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from dependencies import get_db, verify_api_key
from services.dialogue_service import DialogueService
from schemas.session import SessionCreate, MessageSend
from config import settings

router = APIRouter(tags=["Sessions"])


@router.post("/sessions", dependencies=[Depends(verify_api_key)])
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    svc = DialogueService(db)
    return await svc.create_session(body.user_id, body.metadata)


@router.get("/sessions", dependencies=[Depends(verify_api_key)])
async def list_sessions(
    user_id: str | None = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    svc = DialogueService(db)
    return await svc.list_sessions(user_id, skip, limit)


@router.get("/sessions/{session_id}", dependencies=[Depends(verify_api_key)])
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    svc = DialogueService(db)
    result = await svc.get_session(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.post("/sessions/{session_id}/messages", dependencies=[Depends(verify_api_key)])
async def send_message(session_id: str, body: MessageSend, db: AsyncSession = Depends(get_db)):
    svc = DialogueService(db)
    result = await svc.send_message(session_id, body.content, body.enable_search, body.use_memory)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.delete("/sessions/{session_id}", dependencies=[Depends(verify_api_key)])
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    svc = DialogueService(db)
    ok = await svc.delete_session(session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "message": "Session deleted"}


@router.patch("/sessions/{session_id}", dependencies=[Depends(verify_api_key)])
async def update_session(session_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    svc = DialogueService(db)
    ok = await svc.update_session(session_id, body.get("title"))
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}


@router.websocket("/ws/sessions/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    session_id: str,
    x_api_key: str = None,
):
    token = websocket.query_params.get("token")
    key = token or x_api_key or ""
    if settings.api_key_hash:
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        expected = settings.api_key_hash.replace("sha256$", "")
        if key_hash != expected:
            await websocket.close(code=4001, reason="Unauthorized")
            return
    elif not key:
        require = os.environ.get("REQUIRE_API_KEY", "").lower()
        if require not in ("", "0", "false", "no"):
            await websocket.close(code=4001, reason="API key required")
            return

    await websocket.accept()
    from database import async_session
    async with async_session() as db:
        svc = DialogueService(db)
        try:
            while True:
                data = await websocket.receive_json()
                content = data.get("content", "")
                async for token in svc.send_message_stream(session_id, content):
                    await websocket.send_json({"type": "token", "content": token})
                await websocket.send_json({"type": "done"})
        except WebSocketDisconnect:
            pass
