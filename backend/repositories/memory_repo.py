from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from models.memory import Memory, now


class MemoryRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: str | None = None, type: str = "fact", content: str = "", tags: list[str] | None = None, session_id: str | None = None) -> Memory:
        import json
        mem = Memory(
            user_id=user_id,
            type=type,
            content=content,
            tags_json=json.dumps(tags) if tags else None,
            source_session_id=session_id,
        )
        self.db.add(mem)
        await self.db.commit()
        await self.db.refresh(mem)
        return mem

    async def get(self, memory_id: str) -> Memory | None:
        result = await self.db.execute(select(Memory).where(Memory.id == memory_id))
        return result.scalar_one_or_none()

    async def search(self, query: str | None = None, type: str | None = None, limit: int = 10) -> list[Memory]:
        q = select(Memory)
        if type:
            q = q.where(Memory.type == type)
        if query:
            q = q.where(Memory.content.contains(query))
        q = q.order_by(Memory.importance.desc()).limit(limit)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def delete(self, memory_id: str) -> bool:
        mem = await self.get(memory_id)
        if not mem:
            return False
        await self.db.delete(mem)
        await self.db.commit()
        return True

    async def touch(self, memory_id: str):
        await self.db.execute(
            update(Memory).where(Memory.id == memory_id).values(last_accessed=now(), access_count=Memory.access_count + 1)
        )
        await self.db.commit()
