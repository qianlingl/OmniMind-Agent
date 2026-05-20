import json
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.memory_repo import MemoryRepo
from vector_store.chroma_store import add_memory, search_memories, delete_memory as chroma_delete


class MemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MemoryRepo(db)

    async def create(self, type: str, content: str, session_id: str | None = None, tags: list[str] | None = None) -> dict:
        mem = await self.repo.create(type=type, content=content, tags=tags, session_id=session_id)
        await add_memory(mem.id, content, {"type": type, "tags": json.dumps(tags or [])})
        return {
            "memory_id": mem.id,
            "type": mem.type,
            "content": mem.content,
            "created_at": mem.created_at.isoformat() if mem.created_at else "",
        }

    async def search(self, query: str, type: str | None = None, limit: int = 10) -> dict:
        vector_results = await search_memories(query, top_k=limit)
        db_results = await self.repo.search(query=query, type=type, limit=limit)

        seen = set()
        merged = []
        for v in vector_results:
            if v["memory_id"] not in seen:
                seen.add(v["memory_id"])
                merged.append(v)
        for m in db_results:
            if m.id not in seen:
                seen.add(m.id)
                merged.append({"memory_id": m.id, "type": m.type, "content": m.content, "similarity": 0.5})
        return {"results": merged[:limit]}

    async def get(self, memory_id: str) -> dict:
        mem = await self.repo.get(memory_id)
        if not mem:
            return None
        await self.repo.touch(memory_id)
        return {
            "memory_id": mem.id,
            "type": mem.type,
            "content": mem.content,
            "tags": json.loads(mem.tags_json) if mem.tags_json else [],
            "created_at": mem.created_at.isoformat() if mem.created_at else "",
            "last_accessed": mem.last_accessed.isoformat() if mem.last_accessed else "",
        }

    async def delete(self, memory_id: str) -> bool:
        await chroma_delete(memory_id)
        return await self.repo.delete(memory_id)
