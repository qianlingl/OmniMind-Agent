import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    from models import Base
    os.makedirs("data", exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def run_migrations():
    """Apply schema migrations to existing databases (add new columns/indexes without dropping data)."""
    from sqlalchemy import text

    async with engine.begin() as conn:
        for stmt in _MIGRATION_STATEMENTS:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass  # column/index may already exist


_MIGRATION_STATEMENTS = [
    # Add updated_at columns
    "ALTER TABLE learning_goals ADD COLUMN updated_at DATETIME",
    "ALTER TABLE learning_tasks ADD COLUMN updated_at DATETIME",
    "ALTER TABLE flashcards ADD COLUMN updated_at DATETIME",
    "ALTER TABLE quizzes ADD COLUMN updated_at DATETIME",
    "ALTER TABLE quiz_questions ADD COLUMN updated_at DATETIME",
    "ALTER TABLE review_items ADD COLUMN updated_at DATETIME",
    "ALTER TABLE mindmaps ADD COLUMN updated_at DATETIME",
    "ALTER TABLE api_keys ADD COLUMN updated_at DATETIME",
    "ALTER TABLE learning_tasks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE flashcards ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE quiz_questions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE review_items ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
]


async def close_db():
    await engine.dispose()
