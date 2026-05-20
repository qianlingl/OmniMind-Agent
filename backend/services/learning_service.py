import json
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.learning_repo import LearningRepo
from services.goal_decomposer import GoalDecomposer
from services.quiz_engine import QuizEngine
from services.spaced_repetition import SpacedRepetitionEngine
from services.content_generator import ContentGenerator
from services.memory_service import MemoryService
from schemas.learning import GoalCreate


def _now():
    return datetime.now(timezone.utc)


class LearningService:
    """Unified service layer for all learning assistant operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = LearningRepo(db)

    # --- Goals ---

    async def create_goal_with_plan(self, body: GoalCreate) -> dict:
        """Create a learning goal and decompose it into a task plan."""
        goal = await self.repo.create_goal(
            user_id=None,
            title=body.title,
            subject=body.subject,
            topic=body.topic,
            level=body.level,
            daily_minutes=body.daily_minutes,
            duration_weeks=body.duration_weeks,
            available_days=body.available_days,
            notes=body.notes,
        )

        decomposer = GoalDecomposer()
        plan = await decomposer.decompose(
            body.title, body.topic, body.level, body.daily_minutes,
            body.duration_weeks, body.available_days, body.notes,
        )

        await self.repo.update_goal(goal.id, plan_json=json.dumps(plan))
        await self._persist_plan(goal.id, plan)

        return {
            "goal_id": goal.id,
            "title": goal.title,
            "status": goal.status,
            "plan": plan,
            "created_at": goal.created_at.isoformat(),
        }

    async def _persist_plan(self, goal_id: str, plan: dict) -> int:
        """Persist a decomposed plan as LearningTask records."""
        start_date = _now()
        count = 0
        for ms in plan.get("milestones", []):
            week = ms["week"]
            for task in ms.get("tasks", []):
                day_num = task["day"]
                days_offset = (week - 1) * 7 + (day_num - 1)
                scheduled = start_date + timedelta(days=days_offset)
                await self.repo.create_learning_task(
                    goal_id=goal_id,
                    week_num=week,
                    day_num=day_num,
                    title=task["title"],
                    description=None,
                    type=task["type"],
                    duration_min=task["duration_min"],
                    sort_order=task.get("day", 1),
                    scheduled_date=scheduled,
                )
                count += 1
        return count

    async def list_goals(self, user_id: str | None = None) -> list[dict]:
        goals = await self.repo.list_goals(user_id)
        return [
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

    async def get_goal_detail(self, goal_id: str) -> dict | None:
        goal = await self.repo.get_goal(goal_id)
        if not goal:
            return None

        today = _now()
        tasks = await self.repo.get_tasks_by_goal_and_date(goal_id, today)
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

    # --- Tasks ---

    async def get_today_tasks(self, goal_id: str) -> dict | None:
        goal = await self.repo.get_goal(goal_id)
        if not goal:
            return None
        today = _now()
        tasks = await self.repo.get_tasks_by_goal_and_date(goal_id, today)
        total_mins = sum(t.duration_min for t in tasks)
        return {
            "date": today.strftime("%Y-%m-%d"),
            "tasks": [
                {"task_id": t.id, "title": t.title, "type": t.type, "duration_min": t.duration_min, "status": t.status, "order": t.sort_order}
                for t in tasks
            ],
            "total_minutes": total_mins,
        }

    async def complete_task(self, task_id: str, body: dict) -> dict | None:
        task = await self.repo.get_task(task_id)
        if not task:
            return None

        updates = {"status": body.get("status")}
        if body.get("status") == "completed":
            updates["completed_at"] = _now()
            updates["actual_duration_min"] = body.get("actual_duration_min") or task.duration_min

        await self.repo.update_task(task_id, **updates)

        completed = await self.repo.get_completed_task_count(task.goal_id)
        total = await self.repo.get_total_task_count(task.goal_id)
        if total > 0:
            await self.repo.update_goal(task.goal_id, progress_pct=round(completed / total * 100, 1))

        return {
            "task_id": task_id,
            "status": body.get("status"),
            "goal_progress_pct": round(completed / max(total, 1) * 100, 1),
            "xp_earned": 50,
        }

    # --- Quiz ---

    async def start_quiz(self, goal_id: str, topic: str | None, question_count: int = 3) -> dict | None:
        goal = await self.repo.get_goal(goal_id)
        if not goal:
            return None

        quiz = await self.repo.create_quiz(goal_id, topic or goal.topic)

        flashcards = await self.repo.get_flashcards(goal_id)
        concepts = list(set(f.concept for f in flashcards if f.concept))

        engine = QuizEngine()
        questions_data = await engine.start_quiz(topic or goal.topic or "General", question_count, concepts)

        for qd in questions_data:
            qq = await self.repo.create_question(quiz.id, qd["content"], qd.get("expected_concepts", []))
            qd["question_id"] = qq.id

        return {"quiz_id": quiz.id, "questions": questions_data}

    async def submit_quiz_answer(self, quiz_id: str, question_id: str, answer: str) -> dict | None:
        qq = await self.repo.get_question(question_id)
        if not qq:
            return None

        engine = QuizEngine()
        expected = json.loads(qq.expected_concepts_json) if qq.expected_concepts_json else []
        evaluation = await engine.evaluate_answer(qq.question_content, expected, answer)

        score = evaluation["score"]
        missing = evaluation["missing_concepts"]
        feedback = evaluation["feedback"]

        await self.repo.update_question(
            question_id,
            user_answer=answer,
            score=score,
            feedback=feedback,
            missing_concepts_json=json.dumps(missing),
        )

        quiz = await self.repo.get_quiz(quiz_id)
        goal_id = quiz.goal_id if quiz else None

        weak_points = []
        for concept in expected + missing:
            if score < 4 and concept in missing:
                if goal_id:
                    await self.repo.create_review_item(goal_id, concept)
                weak_points.append({"concept": concept, "mastery": max(0.1, score / 5.0)})

        if score < 4:
            mem_svc = MemoryService(self.db)
            for wp in weak_points:
                await mem_svc.create(
                    type="weak_point",
                    content=f"User struggles with: {wp['concept']}",
                    tags=[wp["concept"], "weak_point"],
                )

        next_review = _now() + timedelta(days=1 if score < 3 else 3)
        return {
            "question_id": question_id,
            "score": score,
            "max_score": 5,
            "feedback": feedback,
            "missing_concepts": missing,
            "weak_points": weak_points,
            "next_review_at": next_review.isoformat(),
        }

    # --- Flashcard review ---

    async def submit_flashcard_feedback(self, flashcard_id: str, quality: int) -> dict | None:
        updated = await self.repo.update_flashcard_review(flashcard_id, quality)
        if not updated:
            return None
        next_review = updated.next_review_at or _now() + timedelta(days=1)
        return {
            "review_id": updated.id,
            "concept": updated.concept or "",
            "new_interval_days": updated.interval,
            "next_review_at": next_review.isoformat(),
            "easiness": updated.easiness,
        }

    # --- Review items ---

    async def get_due_reviews(self, goal_id: str) -> dict:
        due = await self.repo.get_due_reviews(goal_id)
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

    async def submit_review_feedback(self, review_id: str, quality: int) -> dict | None:
        updated = await self.repo.update_review_item_review(review_id, quality)
        if not updated:
            return None
        return {
            "review_id": updated.id,
            "concept": updated.concept,
            "new_interval_days": updated.interval,
            "next_review_at": (updated.next_review_at or _now()).isoformat(),
            "easiness": updated.easiness,
        }

    # --- Flashcard generation ---

    async def generate_flashcards(
        self, goal_id: str, content: str, flashcard_count: int = 10
    ) -> dict | None:
        goal = await self.repo.get_goal(goal_id)
        if not goal:
            return None

        gen = ContentGenerator()
        cards = await gen.generate_flashcards(content, flashcard_count)

        if not cards:
            return {
                "batch_id": str(uuid.uuid4().hex[:12]),
                "source": goal.title,
                "flashcards": [],
                "generated_count": 0,
                "created_at": _now().isoformat(),
            }

        batch_id = str(uuid.uuid4().hex[:12])
        flashcards = []
        for card in cards:
            fc = await self.repo.create_flashcard(
                goal_id, card["front"], card["back"], card.get("concept"), card.get("tags", [])
            )
            flashcards.append(_flashcard_dict(fc))

        return {
            "batch_id": batch_id,
            "source": goal.title,
            "flashcards": flashcards,
            "generated_count": len(flashcards),
            "created_at": _now().isoformat(),
        }

    async def list_flashcards(
        self, goal_id: str, status: str | None = None, tag: str | None = None, limit: int = 50
    ) -> dict:
        cards = await self.repo.get_flashcards(goal_id, status, limit)
        flashcards = [_flashcard_dict(fc) for fc in cards]
        if tag:
            flashcards = [fc for fc in flashcards if tag in fc["tags"]]
        return {"flashcards": flashcards, "total": len(flashcards)}

    # --- MindMap ---

    async def generate_mindmap(self, goal_id: str) -> dict | None:
        goal = await self.repo.get_goal(goal_id)
        if not goal:
            return None

        cards = await self.repo.get_flashcards(goal_id, limit=200)
        concepts = [
            {"concept": c.concept or c.front[:80], "tags": json.loads(c.tags_json) if c.tags_json else []}
            for c in cards
        ]

        gen = ContentGenerator()
        mm_data = await gen.generate_mindmap(goal.title or "Learning Map", concepts)

        mm = await self.repo.create_mindmap(goal_id, mm_data["title"], mm_data["content"], mm_data["node_count"])

        return {
            "mindmap_id": mm.id,
            "title": mm.title,
            "format": mm.format,
            "content": mm.content,
            "node_count": mm.node_count,
            "generated_at": mm.created_at.isoformat() if mm.created_at else "",
        }

    # --- Report ---

    async def get_report(self, goal_id: str, period: str = "week") -> dict | None:
        goal = await self.repo.get_goal(goal_id)
        if not goal:
            return None

        completed = await self.repo.get_completed_task_count(goal_id)
        total = await self.repo.get_total_task_count(goal_id)

        due = await self.repo.get_due_reviews(goal_id)

        cards = await self.repo.get_flashcards(goal_id, limit=200)
        topic_mastery: dict[str, list[float]] = {}
        for fc in cards:
            tags = json.loads(fc.tags_json) if fc.tags_json else ["General"]
            for tag in tags:
                if tag not in topic_mastery:
                    topic_mastery[tag] = []
                topic_mastery[tag].append(fc.mastery)

        mastery_by_topic = [
            {"topic": tag, "mastery": round(sum(vals) / len(vals), 2)}
            for tag, vals in topic_mastery.items()
        ]
        weak_points = [fc.concept for fc in cards if fc.mastery < 0.4 and fc.concept]

        return {
            "goal_id": goal_id,
            "period": period,
            "stats": {
                "tasks_completed": completed,
                "tasks_total": total,
                "study_minutes": goal.daily_minutes * completed,
                "quiz_avg_score": 0,
                "reviews_completed": len([r for r in due if r.status == "completed"]),
                "new_concepts_learned": len(cards),
                "streak_days": goal.streak_days,
                "mastery_overall": round(sum(fc.mastery for fc in cards) / max(len(cards), 1), 2),
            },
            "mastery_by_topic": mastery_by_topic,
            "weak_points": weak_points[:10],
            "study_calendar": [],
        }


def _flashcard_dict(fc) -> dict:
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
