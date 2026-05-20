from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from dependencies import get_db, verify_api_key
from services.memory_service import MemoryService
from schemas.memory import MemoryCreate

router = APIRouter(tags=["Memory"])


@router.post("/memory", dependencies=[Depends(verify_api_key)])
async def create_memory(body: MemoryCreate, db: AsyncSession = Depends(get_db)):
    svc = MemoryService(db)
    return await svc.create(body.type, body.content, body.session_id, body.tags)


@router.get("/memory/search", dependencies=[Depends(verify_api_key)])
async def search_memory(query: str = Query(...), type: str | None = None, limit: int = 10, db: AsyncSession = Depends(get_db)):
    svc = MemoryService(db)
    return await svc.search(query, type, limit)


@router.get("/memory/{memory_id}", dependencies=[Depends(verify_api_key)])
async def get_memory(memory_id: str, db: AsyncSession = Depends(get_db)):
    svc = MemoryService(db)
    result = await svc.get(memory_id)
    if not result:
        raise HTTPException(status_code=404, detail="Memory not found")
    return result


@router.delete("/memory/{memory_id}", dependencies=[Depends(verify_api_key)])
async def delete_memory(memory_id: str, db: AsyncSession = Depends(get_db)):
    svc = MemoryService(db)
    ok = await svc.delete(memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"success": True, "message": "Memory deleted"}
