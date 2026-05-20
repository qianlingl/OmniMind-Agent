import json
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from dependencies import get_db, verify_api_key
from repositories.learning_repo import LearningRepo
from services.goal_decomposer import GoalDecomposer
from services.quiz_engine import QuizEngine
from services.spaced_repetition import SpacedRepetitionEngine
from services.content_generator import ContentGenerator
from services.memory_service import MemoryService
from schemas.learning import (
    GoalCreate, TaskUpdate, QuizStartRequest, QuizAnswerRequest,
    ReviewFeedbackRequest, MindMapGenerateRequest,
)

router = APIRouter(tags=["Learning Assistant"])


def _now():
    return datetime.now(timezone.utc)


# --- Goals ---

@router.post("/learning/goals", dependencies=[Depends(verify_api_key)])
async def create_goal(body: GoalCreate, db: AsyncSession = Depends(get_db)):
    if body.daily_minutes < 1:
        raise HTTPException(status_code=422, detail="daily_minutes must be > 0")
    if body.duration_weeks < 1:
        raise HTTPException(status_code=422, detail="duration_weeks must be > 0")

    repo = LearningRepo(db)
    goal = await repo.create_goal(
        user_id=None, title=body.title, subject=body.subject, topic=body.topic,
        level=body.level, daily_minutes=body.daily_minutes, duration_weeks=body.duration_weeks,
        available_days=body.available_days, notes=body.notes,
    )

    decomposer = GoalDecomposer()
    plan = await decomposer.decompose(
        body.title, body.topic, body.level, body.daily_minutes,
        body.duration_weeks, body.available_days, body.notes,
    )

    await repo.update_goal(goal.id, plan_json=json.dumps(plan))

    start_date = _now()
    for ms in plan.get("milestones", []):
        week = ms["week"]
        for task in ms.get("tasks", []):
            day_num = task["day"]
            days_offset = (week - 1) * 7 + (day_num - 1)
            scheduled = start_date + timedelta(days=days_offset)
            await repo.create_learning_task(
                goal_id=goal.id, week_num=week, day_num=day_num,
                title=task["title"], description=None, type=task["type"],
                duration_min=task["duration_min"], sort_order=task.get("day", 1),
                scheduled_date=scheduled,
            )

    return {
        "goal_id": goal.id,
        "title": goal.title,
        "status": goal.status,
        "plan": plan,
        "created_at": goal.created_at.isoformat(),
    }


@router.get("/learning/goals", dependencies=[Depends(verify_api_key)])
async def list_goals(db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    goals = await repo.list_goals()
    return {
        "goals": [
            {
                "goal_id": g.id,
                "title": g.title,
                "status": g.status,
                "progress_pct": g.progress_pct,
                "streak_days": g.streak_days,
                "created_at": g.created_at.isoformat() if g.created_at else "",
            }
            for g in goals
        ]
    }


@router.get("/learning/goals/{goal_id}", dependencies=[Depends(verify_api_key)])
async def get_goal(goal_id: str, db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    goal = await repo.get_goal(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    today = _now()
    tasks = await repo.get_tasks_by_goal_and_date(goal_id, today)
    current_milestone = {
        "week": goal.current_week,
        "title": f"Week {goal.current_week}",
        "tasks": [
            {"task_id": t.id, "title": t.title, "duration_min": t.duration_min, "status": t.status}
            for t in tasks
        ],
    }

    total_mins = goal.daily_minutes * len(json.loads(goal.available_days_json or "[]")) * goal.current_week

    return {
        "goal_id": goal.id,
        "title": goal.title,
        "status": goal.status,
        "progress_pct": goal.progress_pct,
        "current_week": goal.current_week,
        "current_milestone": current_milestone,
        "streak_days": goal.streak_days,
        "total_study_minutes": total_mins,
    }


# --- Daily Tasks ---

@router.get("/learning/goals/{goal_id}/tasks/today", dependencies=[Depends(verify_api_key)])
async def get_today_tasks(goal_id: str, db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    goal = await repo.get_goal(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    today = _now()
    tasks = await repo.get_tasks_by_goal_and_date(goal_id, today)
    total_mins = sum(t.duration_min for t in tasks)
    return {
        "date": today.strftime("%Y-%m-%d"),
        "tasks": [
            {"task_id": t.id, "title": t.title, "type": t.type, "duration_min": t.duration_min, "status": t.status, "order": t.sort_order}
            for t in tasks
        ],
        "total_minutes": total_mins,
    }


@router.patch("/learning/tasks/{task_id}", dependencies=[Depends(verify_api_key)])
async def update_task(task_id: str, body: TaskUpdate, db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    task = await repo.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = {"status": body.status}
    if body.status == "completed":
        updates["completed_at"] = _now()
        updates["actual_duration_min"] = body.actual_duration_min or task.duration_min

    await repo.update_task(task_id, **updates)

    # Recalculate goal progress
    completed = await repo.get_completed_task_count(task.goal_id)
    total = await repo.get_total_task_count(task.goal_id)
    if total > 0:
        await repo.update_goal(task.goal_id, progress_pct=round(completed / total * 100, 1))

    return {"task_id": task_id, "status": body.status, "goal_progress_pct": round(completed / max(total, 1) * 100, 1), "xp_earned": 50}


# --- Quiz ---

@router.post("/learning/goals/{goal_id}/quiz/start", dependencies=[Depends(verify_api_key)])
async def start_quiz(goal_id: str, body: QuizStartRequest, db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    goal = await repo.get_goal(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    quiz = await repo.create_quiz(goal_id, body.topic or goal.topic)

    # Gather learned concepts from flashcards and review items
    flashcards = await repo.get_flashcards(goal_id)
    concepts = list(set(f.concept for f in flashcards if f.concept))

    engine = QuizEngine()
    questions_data = await engine.start_quiz(body.topic or goal.topic or "General", body.question_count, concepts)

    for qd in questions_data:
        qq = await repo.create_question(quiz.id, qd["content"], qd.get("expected_concepts", []))
        qd["question_id"] = qq.id

    return {"quiz_id": quiz.id, "questions": questions_data}


@router.post("/learning/quiz/{quiz_id}/answer", dependencies=[Depends(verify_api_key)])
async def submit_answer(quiz_id: str, body: QuizAnswerRequest, db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    qq = await repo.get_question(body.question_id)
    if not qq:
        raise HTTPException(status_code=404, detail="Question not found")

    engine = QuizEngine()
    expected = json.loads(qq.expected_concepts_json) if qq.expected_concepts_json else []
    evaluation = await engine.evaluate_answer(qq.question_content, expected, body.answer)

    score = evaluation["score"]
    missing = evaluation["missing_concepts"]
    feedback = evaluation["feedback"]

    await repo.update_question(
        body.question_id,
        user_answer=body.answer,
        score=score,
        feedback=feedback,
        missing_concepts_json=json.dumps(missing),
    )

    # Get the quiz to obtain goal_id for review items
    quiz = await repo.get_quiz(quiz_id)
    goal_id = quiz.goal_id if quiz else None

    # Update review_item / create if new for each concept
    sre = SpacedRepetitionEngine()
    weak_points = []
    for concept in expected + missing:
        if score < 4 and concept in missing:
            if goal_id:
                await repo.create_review_item(goal_id, concept)
            weak_points.append({"concept": concept, "mastery": max(0.1, score / 5.0)})

    # Also save weak points to memory
    if score < 4:
        mem_svc = MemoryService(db)
        for wp in weak_points:
            await mem_svc.create(type="weak_point", content=f"User struggles with: {wp['concept']}", tags=[wp["concept"], "weak_point"])

    next_review = _now() + timedelta(days=1 if score < 3 else 3)
    return {
        "question_id": body.question_id,
        "score": score,
        "max_score": 5,
        "feedback": feedback,
        "missing_concepts": missing,
        "weak_points": weak_points,
        "next_review_at": next_review.isoformat(),
    }


@router.post("/learning/flashcards/{flashcard_id}/feedback", dependencies=[Depends(verify_api_key)])
async def submit_flashcard_feedback(flashcard_id: str, body: ReviewFeedbackRequest, db: AsyncSession = Depends(get_db)):
    """
    Submit review feedback for a flashcard. Accepts flashcard_id (not review_id).
    """
    repo = LearningRepo(db)
    fc = await repo.get_flashcard(flashcard_id)
    if not fc:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    new_easiness, new_interval, new_reps, new_mastery, next_review = SpacedRepetitionEngine.process_review(
        body.quality, fc.easiness, fc.interval, fc.repetitions, fc.mastery
    )
    await repo.update_flashcard(
        flashcard_id,
        easiness=new_easiness,
        interval=new_interval,
        repetitions=new_reps,
        mastery=new_mastery,
        next_review_at=next_review,
        reviews_count=fc.reviews_count + 1,
    )

    return {
        "review_id": flashcard_id,
        "concept": fc.concept or "",
        "new_interval_days": new_interval,
        "next_review_at": next_review.isoformat(),
        "easiness": new_easiness,
    }


# --- Reviews ---

@router.get("/learning/goals/{goal_id}/reviews", dependencies=[Depends(verify_api_key)])
async def get_reviews(goal_id: str, db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    due = await repo.get_due_reviews(goal_id)
    now_ts = _now()
    return {
        "due_reviews": [
            {
                "review_id": r.id,
                "concept": r.concept,
                "mastery": r.mastery,
                "last_reviewed": r.last_reviewed.isoformat() if r.last_reviewed else "",
                "interval_days": r.interval,
                "status": "overdue" if r.next_review_at and r.next_review_at < now_ts else "due_today",
            }
            for r in due
        ],
        "total_due": len(due),
    }


@router.post("/learning/reviews/{review_id}/feedback", dependencies=[Depends(verify_api_key)])
async def submit_review_feedback(review_id: str, body: ReviewFeedbackRequest, db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    ri = await repo.get_review_item(review_id)
    if not ri:
        raise HTTPException(status_code=404, detail="Review item not found")

    sre = SpacedRepetitionEngine()
    new_easiness, new_interval, new_reps = sre.calculate(
        body.quality, ri.easiness, ri.interval, ri.repetitions, ri.mastery
    )
    new_mastery = sre.update_mastery(ri.mastery, body.quality)
    next_review = sre.next_review_date(new_interval)

    await repo.update_review_item(review_id,
                                  easiness=new_easiness, interval=new_interval,
                                  repetitions=new_reps, mastery=new_mastery,
                                  last_reviewed=_now(), next_review_at=next_review,
                                  status="completed" if new_mastery >= 0.9 else "pending")

    return {
        "review_id": review_id,
        "concept": ri.concept,
        "new_interval_days": new_interval,
        "next_review_at": next_review.isoformat(),
        "easiness": new_easiness,
    }


# --- Flashcards ---

@router.post("/learning/goals/{goal_id}/flashcards/generate", dependencies=[Depends(verify_api_key)])
async def generate_flashcards(goal_id: str, file: UploadFile | None = File(default=None),
                                text: str | None = Form(default=None),
                                flashcard_count: int = Form(default=10),
                                db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    goal = await repo.get_goal(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if file:
        content = (await file.read()).decode("utf-8", errors="ignore")
    elif text:
        content = text
    else:
        raise HTTPException(status_code=422, detail="Provide file or text")

    gen = ContentGenerator()
    cards = await gen.generate_flashcards(content, flashcard_count)

    if not cards:
        return {"batch_id": str(uuid.uuid4().hex[:12]), "source": goal.title, "flashcards": [], "generated_count": 0, "created_at": _now().isoformat()}

    batch_id = str(uuid.uuid4().hex[:12])
    flashcards = []
    for card in cards:
        fc = await repo.create_flashcard(goal_id, card["front"], card["back"], card.get("concept"), card.get("tags", []))
        fc_d = FlashcardDict(fc)
        flashcards.append(fc_d)

    return {"batch_id": batch_id, "source": goal.title, "flashcards": flashcards, "generated_count": len(flashcards), "created_at": _now().isoformat()}


def FlashcardDict(fc) -> dict:
    return {
        "flashcard_id": fc.id,
        "front": fc.front,
        "back": fc.back,
        "tags": json.loads(fc.tags_json) if fc.tags_json else [],
        "concept": fc.concept,
        "mastery": fc.mastery,
        "reviews_count": fc.reviews_count,
        "next_review_at": fc.next_review_at.isoformat() if fc.next_review_at else None,
    }


@router.get("/learning/goals/{goal_id}/flashcards", dependencies=[Depends(verify_api_key)])
async def list_flashcards(goal_id: str, status: str | None = None, tag: str | None = None,
                            limit: int = 50, db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    cards = await repo.get_flashcards(goal_id, status, limit)
    flashcards = [FlashcardDict(fc) for fc in cards]
    if tag:
        flashcards = [fc for fc in flashcards if tag in fc["tags"]]
    return {"flashcards": flashcards, "total": len(flashcards)}


# --- MindMap ---

@router.post("/learning/goals/{goal_id}/mindmap/generate", dependencies=[Depends(verify_api_key)])
async def generate_mindmap(goal_id: str, body: MindMapGenerateRequest, db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    goal = await repo.get_goal(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    cards = await repo.get_flashcards(goal_id, limit=200)
    concepts = [{"concept": c.concept or c.front[:80], "tags": json.loads(c.tags_json) if c.tags_json else []} for c in cards]

    gen = ContentGenerator()
    mm_data = await gen.generate_mindmap(goal.title or "Learning Map", concepts)

    mm = await repo.create_mindmap(goal_id, mm_data["title"], mm_data["content"], mm_data["node_count"])

    return {
        "mindmap_id": mm.id,
        "title": mm.title,
        "format": mm.format,
        "content": mm.content,
        "node_count": mm.node_count,
        "generated_at": mm.created_at.isoformat() if mm.created_at else "",
    }


# --- Report ---

@router.get("/learning/goals/{goal_id}/report", dependencies=[Depends(verify_api_key)])
async def get_report(goal_id: str, period: str = "week", db: AsyncSession = Depends(get_db)):
    repo = LearningRepo(db)
    goal = await repo.get_goal(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    completed = await repo.get_completed_task_count(goal_id)
    total = await repo.get_total_task_count(goal_id)

    # Get reviews
    due = await repo.get_due_reviews(goal_id)
    all_reviews = due  # Simplified

    # Mastery by topic (from flashcards)
    cards = await repo.get_flashcards(goal_id, limit=200)
    topic_mastery = {}
    for fc in cards:
        tags = json.loads(fc.tags_json) if fc.tags_json else ["General"]
        for tag in tags:
            if tag not in topic_mastery:
                topic_mastery[tag] = []
            topic_mastery[tag].append(fc.mastery)

    mastery_by_topic = [{"topic": tag, "mastery": round(sum(vals)/len(vals), 2)} for tag, vals in topic_mastery.items()]

    weak_points = [fc.concept for fc in cards if fc.mastery < 0.4 and fc.concept]

    return {
        "goal_id": goal_id,
        "period": period,
        "stats": {
            "tasks_completed": completed,
            "tasks_total": total,
            "study_minutes": goal.daily_minutes * completed,
            "quiz_avg_score": 0,
            "reviews_completed": 0,
            "new_concepts_learned": len(cards),
            "streak_days": goal.streak_days,
            "mastery_overall": round(sum(fc.mastery for fc in cards) / max(len(cards), 1), 2),
        },
        "mastery_by_topic": mastery_by_topic,
        "weak_points": weak_points[:10],
        "study_calendar": [],
    }
