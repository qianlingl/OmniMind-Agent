import pytest
import json
from repositories.learning_repo import LearningRepo
from models.learning import now
from datetime import timedelta


@pytest.mark.asyncio
async def test_create_goal(db_session):
    repo = LearningRepo(db_session)
    goal = await repo.create_goal(
        user_id="u1", title="Learn Python", subject="programming", topic="Python",
        level="beginner", daily_minutes=60, duration_weeks=12,
        available_days=["monday", "tuesday", "wednesday"],
        notes="test",
    )
    assert goal.id is not None
    assert goal.title == "Learn Python"
    assert goal.daily_minutes == 60
    assert goal.level == "beginner"


@pytest.mark.asyncio
async def test_create_learning_task(db_session):
    repo = LearningRepo(db_session)
    goal = await repo.create_goal(user_id="u1", title="T", subject=None, topic=None, level="beginner", daily_minutes=60, duration_weeks=12, available_days=["monday"], notes=None)
    t = await repo.create_learning_task(
        goal_id=goal.id, week_num=1, day_num=1, title="Task 1",
        description="desc", type="reading", duration_min=30,
        sort_order=1, scheduled_date=now(),
    )
    assert t.goal_id == goal.id
    assert t.status == "pending"


@pytest.mark.asyncio
async def test_get_tasks_by_date(db_session):
    repo = LearningRepo(db_session)
    goal = await repo.create_goal(user_id="u1", title="T", subject=None, topic=None, level="beginner", daily_minutes=60, duration_weeks=12, available_days=["monday"], notes=None)
    today = now()
    await repo.create_learning_task(goal.id, 1, 1, "T1", None, "reading", 30, 1, today)
    await repo.create_learning_task(goal.id, 1, 1, "T2", None, "practice", 30, 2, today)
    tasks = await repo.get_tasks_by_goal_and_date(goal.id, today)
    assert len(tasks) == 2


@pytest.mark.asyncio
async def test_flashcard_lifecycle(db_session):
    repo = LearningRepo(db_session)
    goal = await repo.create_goal(user_id="u1", title="T", subject=None, topic=None, level="beginner", daily_minutes=60, duration_weeks=12, available_days=["monday"], notes=None)
    fc = await repo.create_flashcard(goal.id, "What is Python?", "A programming language.", "Python", ["programming"])
    assert fc.front == "What is Python?"
    assert fc.mastery == 0.0

    # Update mastery
    await repo.update_flashcard(fc.id, mastery=0.8, interval=3)
    fc2 = await repo.get_flashcard(fc.id)
    assert fc2.mastery == 0.8
    assert fc2.interval == 3


@pytest.mark.asyncio
async def test_quiz_flow(db_session):
    repo = LearningRepo(db_session)
    goal = await repo.create_goal(user_id="u1", title="T", subject=None, topic=None, level="beginner", daily_minutes=60, duration_weeks=12, available_days=["monday"], notes=None)
    quiz = await repo.create_quiz(goal.id, "Python basics")
    assert quiz.status == "in_progress"

    qq = await repo.create_question(quiz.id, "Explain variables", ["variables", "assignment"])
    assert qq.quiz_id == quiz.id

    await repo.update_question(qq.id, user_answer="Variables store values", score=4, feedback="Good")
    qq2 = await repo.get_question(qq.id)
    assert qq2.score == 4


@pytest.mark.asyncio
async def test_review_items(db_session):
    repo = LearningRepo(db_session)
    goal = await repo.create_goal(user_id="u1", title="T", subject=None, topic=None, level="beginner", daily_minutes=60, duration_weeks=12, available_days=["monday"], notes=None)
    ri = await repo.create_review_item(goal.id, "Variables")
    assert ri.concept == "Variables"
    assert ri.mastery == 0.5

    await repo.update_review_item(ri.id, mastery=0.9, status="completed")
    ri2 = await repo.get_review_item(ri.id)
    assert ri2.mastery == 0.9
    assert ri2.status == "completed"


@pytest.mark.asyncio
async def test_mindmap(db_session):
    repo = LearningRepo(db_session)
    goal = await repo.create_goal(user_id="u1", title="T", subject=None, topic=None, level="beginner", daily_minutes=60, duration_weeks=12, available_days=["monday"], notes=None)
    mm = await repo.create_mindmap(goal.id, "Python Map", "mindmap\n  root((Python))", 2)
    assert mm.title == "Python Map"
    assert mm.node_count == 2


@pytest.mark.asyncio
async def test_task_status_update(db_session):
    repo = LearningRepo(db_session)
    goal = await repo.create_goal(user_id="u1", title="T", subject=None, topic=None, level="beginner", daily_minutes=60, duration_weeks=12, available_days=["monday"], notes=None)
    t = await repo.create_learning_task(goal.id, 1, 1, "T1", None, "reading", 30, 1, now())
    await repo.update_task(t.id, status="completed", completed_at=now(), actual_duration_min=35)
    t2 = await repo.get_task(t.id)
    assert t2.status == "completed"
    assert t2.actual_duration_min == 35
