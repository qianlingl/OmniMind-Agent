from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from dependencies import get_db, verify_api_key
from services.learning_service import LearningService
from schemas.learning import (
    GoalCreate, TaskUpdate, QuizStartRequest, QuizAnswerRequest,
    ReviewFeedbackRequest, MindMapGenerateRequest,
)

router = APIRouter(tags=["Learning Assistant"])


def _svc(db: AsyncSession) -> LearningService:
    return LearningService(db)


# --- Goals ---

@router.post("/learning/goals", dependencies=[Depends(verify_api_key)])
async def create_goal(body: GoalCreate, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.create_goal_with_plan(body)
    return result


@router.get("/learning/goals", dependencies=[Depends(verify_api_key)])
async def list_goals(db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    return {"goals": await service.list_goals()}


@router.get("/learning/goals/{goal_id}", dependencies=[Depends(verify_api_key)])
async def get_goal(goal_id: str, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.get_goal_detail(goal_id)
    if not result:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result


# --- Daily Tasks ---

@router.get("/learning/goals/{goal_id}/tasks/today", dependencies=[Depends(verify_api_key)])
async def get_today_tasks(goal_id: str, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.get_today_tasks(goal_id)
    if not result:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result


@router.patch("/learning/tasks/{task_id}", dependencies=[Depends(verify_api_key)])
async def update_task(task_id: str, body: TaskUpdate, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.complete_task(task_id, body.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


# --- Quiz ---

@router.post("/learning/goals/{goal_id}/quiz/start", dependencies=[Depends(verify_api_key)])
async def start_quiz(goal_id: str, body: QuizStartRequest, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.start_quiz(goal_id, body.topic, body.question_count)
    if not result:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result


@router.post("/learning/quiz/{quiz_id}/answer", dependencies=[Depends(verify_api_key)])
async def submit_answer(quiz_id: str, body: QuizAnswerRequest, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.submit_quiz_answer(quiz_id, body.question_id, body.answer)
    if not result:
        raise HTTPException(status_code=404, detail="Question not found")
    return result


@router.post("/learning/flashcards/{flashcard_id}/feedback", dependencies=[Depends(verify_api_key)])
async def submit_flashcard_feedback(flashcard_id: str, body: ReviewFeedbackRequest, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.submit_flashcard_feedback(flashcard_id, body.quality)
    if not result:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    return result


# --- Reviews ---

@router.get("/learning/goals/{goal_id}/reviews", dependencies=[Depends(verify_api_key)])
async def get_reviews(goal_id: str, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    return await service.get_due_reviews(goal_id)


@router.post("/learning/reviews/{review_id}/feedback", dependencies=[Depends(verify_api_key)])
async def submit_review_feedback(review_id: str, body: ReviewFeedbackRequest, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.submit_review_feedback(review_id, body.quality)
    if not result:
        raise HTTPException(status_code=404, detail="Review item not found")
    return result


# --- Flashcards ---

@router.post("/learning/goals/{goal_id}/flashcards/generate", dependencies=[Depends(verify_api_key)])
async def generate_flashcards(
    goal_id: str,
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    flashcard_count: int = Form(default=10),
    db: AsyncSession = Depends(get_db),
):
    service = _svc(db)
    if file:
        content = (await file.read()).decode("utf-8", errors="ignore")
    elif text:
        content = text
    else:
        raise HTTPException(status_code=422, detail="Provide file or text")

    result = await service.generate_flashcards(goal_id, content, flashcard_count)
    if not result:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result


@router.get("/learning/goals/{goal_id}/flashcards", dependencies=[Depends(verify_api_key)])
async def list_flashcards(
    goal_id: str,
    status: str | None = None,
    tag: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    service = _svc(db)
    return await service.list_flashcards(goal_id, status, tag, limit)


# --- MindMap ---

@router.post("/learning/goals/{goal_id}/mindmap/generate", dependencies=[Depends(verify_api_key)])
async def generate_mindmap(goal_id: str, body: MindMapGenerateRequest, db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.generate_mindmap(goal_id)
    if not result:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result


# --- Report ---

@router.get("/learning/goals/{goal_id}/report", dependencies=[Depends(verify_api_key)])
async def get_report(goal_id: str, period: str = "week", db: AsyncSession = Depends(get_db)):
    service = _svc(db)
    result = await service.get_report(goal_id, period)
    if not result:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result
