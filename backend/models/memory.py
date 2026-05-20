from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, Float, Index
from sqlalchemy.orm import Mapped, mapped_column
from models import Base
from models.session import gen_id, now


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_id)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    type: Mapped[str] = mapped_column(String(20), default="fact")
    content: Mapped[str] = mapped_column(Text)
    tags_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_session_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    importance: Mapped[float] = mapped_column(Float, default=0.5)
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    last_accessed: Mapped[datetime] = mapped_column(DateTime, default=now)

    __table_args__ = (
        Index("ix_memories_user_type", "user_id", "type"),
        Index("ix_memories_source_session", "source_session_id"),
        Index("ix_memories_importance", "importance"),
    )
