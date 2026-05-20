import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from models.session import Session, Message, now
from models.memory import Memory


class SessionRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: str | None = None, title: str = "New Session") -> Session:
        session = Session(user_id=user_id, title=title)
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def list_by_user(self, user_id: str | None = None, skip: int = 0, limit: int = 20) -> tuple[list[dict], int]:
        base_q = select(Session)
        if user_id:
            base_q = base_q.where(Session.user_id == user_id)

        count_q = select(func.count()).select_from(base_q.subquery())
        count_r = await self.db.execute(count_q)
        total = count_r.scalar() or 0

        sessions_q = (
            select(Session, func.count(Message.id).label("msg_count"))
            .outerjoin(Message, Message.session_id == Session.id)
            .group_by(Session.id)
            .order_by(Session.last_active.desc())
            .offset(skip)
            .limit(limit)
        )
        if user_id:
            sessions_q = sessions_q.where(Session.user_id == user_id)
        result = await self.db.execute(sessions_q)
        rows = result.all()

        out = []
        for s, msg_count in rows:
            out.append({
                "session_id": s.id,
                "title": s.title or f"对话 {s.id[:6]}",
                "created_at": s.created_at.isoformat() if s.created_at else "",
                "last_active": s.last_active.isoformat() if s.last_active else "",
                "message_count": msg_count,
            })
        return out, total

    async def get(self, session_id: str) -> Session | None:
        result = await self.db.execute(select(Session).where(Session.id == session_id))
        return result.scalar_one_or_none()

    async def delete(self, session_id: str) -> bool:
        session = await self.get(session_id)
        if not session:
            return False
        await self.db.delete(session)
        await self.db.commit()
        return True

    async def touch(self, session_id: str):
        await self.db.execute(
            update(Session).where(Session.id == session_id).values(last_active=now())
        )

    async def add_message(self, session_id: str, role: str, content: str, token_count: int = 0, metadata_json: str | None = None) -> Message:
        msg = Message(session_id=session_id, role=role, content=content, token_count=token_count, metadata_json=metadata_json)
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)
        await self.touch(session_id)
        return msg

    async def get_messages(self, session_id: str) -> list[dict]:
        result = await self.db.execute(
            select(Message).where(Message.session_id == session_id).order_by(Message.created_at)
        )
        msgs = result.scalars().all()
        return [{"role": m.role, "content": m.content, "timestamp": m.created_at.isoformat() if m.created_at else ""} for m in msgs]

    async def get_messages_orm(self, session_id: str) -> list[Message]:
        result = await self.db.execute(
            select(Message).where(Message.session_id == session_id).order_by(Message.created_at)
        )
        return list(result.scalars().all())

    async def update_message_compressed(self, msg_id: str, content: str):
        await self.db.execute(
            update(Message).where(Message.id == msg_id).values(content=content, is_compressed=True)
        )
        await self.db.commit()

    async def update(self, session_id: str, title: str | None = None) -> bool:
        session = await self.get(session_id)
        if not session:
            return False
        vals = {}
        if title is not None:
            vals["title"] = title
        if vals:
            await self.db.execute(update(Session).where(Session.id == session_id).values(**vals))
            await self.db.commit()
        return True
