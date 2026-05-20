import pytest
from repositories.session_repo import SessionRepo


@pytest.mark.asyncio
async def test_create_session(db_session):
    repo = SessionRepo(db_session)
    session = await repo.create(user_id="user1", title="Test")
    assert session.id is not None
    assert session.title == "Test"


@pytest.mark.asyncio
async def test_add_message(db_session):
    repo = SessionRepo(db_session)
    session = await repo.create(user_id="user1")
    msg = await repo.add_message(session.id, "user", "Hello", token_count=2)
    assert msg.role == "user"
    assert msg.content == "Hello"


@pytest.mark.asyncio
async def test_list_sessions(db_session):
    repo = SessionRepo(db_session)
    await repo.create(user_id="user1", title="S1")
    await repo.create(user_id="user1", title="S2")
    sessions = await repo.list_by_user("user1")
    assert len(sessions) == 2


@pytest.mark.asyncio
async def test_delete_session(db_session):
    repo = SessionRepo(db_session)
    session = await repo.create()
    ok = await repo.delete(session.id)
    assert ok is True
    assert await repo.get(session.id) is None
