import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from models.learning import (
    LearningGoal, LearningTask, Flashcard, Quiz, QuizQuestion,
    ReviewItem, MindMap, now,
)


class LearningRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Goals ---
    async def create_goal(self, user_id: str | None, title: str, subject: str | None, topic: str | None,
                          level: str, daily_minutes: int, duration_weeks: int,
                          available_days: list[str], notes: str | None) -> LearningGoal:
        goal = LearningGoal(
            user_id=user_id, title=title, subject=subject, topic=topic,
            level=level, daily_minutes=daily_minutes, duration_weeks=duration_weeks,
            available_days_json=json.dumps(available_days), notes=notes,
        )
        self.db.add(goal)
        await self.db.commit()
        await self.db.refresh(goal)
        return goal

    async def get_goal(self, goal_id: str) -> LearningGoal | None:
        result = await self.db.execute(select(LearningGoal).where(LearningGoal.id == goal_id))
        return result.scalar_one_or_none()

    async def list_goals(self, user_id: str | None = None) -> list[LearningGoal]:
        q = select(LearningGoal).order_by(LearningGoal.created_at.desc())
        if user_id:
            q = q.where(LearningGoal.user_id == user_id)
        r = await self.db.execute(q)
        return list(r.scalars().all())

    async def update_goal(self, goal_id: str, **kwargs):
        await self.db.execute(update(LearningGoal).where(LearningGoal.id == goal_id).values(**kwargs))
        await self.db.commit()

    # --- Tasks ---
    async def create_learning_task(self, goal_id: str, week_num: int, day_num: int, title: str,
                                   description: str | None, type: str, duration_min: int,
                                   sort_order: int, scheduled_date: datetime) -> LearningTask:
        t = LearningTask(
            goal_id=goal_id, week_num=week_num, day_num=day_num,
            title=title, description=description, type=type,
            duration_min=duration_min, sort_order=sort_order,
            scheduled_date=scheduled_date,
        )
        self.db.add(t)
        await self.db.commit()
        await self.db.refresh(t)
        return t

    async def get_tasks_by_goal_and_date(self, goal_id: str, date: datetime) -> list[LearningTask]:
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        result = await self.db.execute(
            select(LearningTask)
            .where(LearningTask.goal_id == goal_id)
            .where(LearningTask.scheduled_date >= day_start)
            .where(LearningTask.scheduled_date <= day_end)
            .order_by(LearningTask.sort_order)
        )
        return list(result.scalars().all())

    async def get_task(self, task_id: str) -> LearningTask | None:
        result = await self.db.execute(select(LearningTask).where(LearningTask.id == task_id))
        return result.scalar_one_or_none()

    async def update_task(self, task_id: str, **kwargs):
        await self.db.execute(update(LearningTask).where(LearningTask.id == task_id).values(**kwargs))
        await self.db.commit()

    async def get_completed_task_count(self, goal_id: str) -> int:
        result = await self.db.execute(
            select(func.count(LearningTask.id))
            .where(LearningTask.goal_id == goal_id)
            .where(LearningTask.status == "completed")
        )
        return result.scalar() or 0

    async def get_total_task_count(self, goal_id: str) -> int:
        result = await self.db.execute(
            select(func.count(LearningTask.id)).where(LearningTask.goal_id == goal_id)
        )
        return result.scalar() or 0

    # --- Flashcards ---
    async def create_flashcard(self, goal_id: str, front: str, back: str, concept: str | None,
                               tags: list[str] | None) -> Flashcard:
        fc = Flashcard(
            goal_id=goal_id, front=front, back=back, concept=concept,
            tags_json=json.dumps(tags) if tags else None,
        )
        self.db.add(fc)
        await self.db.commit()
        await self.db.refresh(fc)
        return fc

    async def get_flashcards(self, goal_id: str, status: str | None = None, limit: int = 50) -> list[Flashcard]:
        q = select(Flashcard).where(Flashcard.goal_id == goal_id)
        now_ts = datetime.now(timezone.utc)
        if status == "due":
            q = q.where(Flashcard.next_review_at <= now_ts)
        elif status == "mastered":
            q = q.where(Flashcard.mastery >= 0.9)
        q = q.limit(limit)
        r = await self.db.execute(q)
        return list(r.scalars().all())

    async def get_flashcard(self, flashcard_id: str) -> Flashcard | None:
        result = await self.db.execute(select(Flashcard).where(Flashcard.id == flashcard_id))
        return result.scalar_one_or_none()

    async def update_flashcard(self, flashcard_id: str, **kwargs):
        await self.db.execute(update(Flashcard).where(Flashcard.id == flashcard_id).values(**kwargs))
        await self.db.commit()

    # --- Quizzes ---
    async def create_quiz(self, goal_id: str, topic: str | None) -> Quiz:
        q = Quiz(goal_id=goal_id, topic=topic)
        self.db.add(q)
        await self.db.commit()
        await self.db.refresh(q)
        return q

    async def get_quiz(self, quiz_id: str) -> Quiz | None:
        result = await self.db.execute(select(Quiz).where(Quiz.id == quiz_id))
        return result.scalar_one_or_none()

    async def update_quiz(self, quiz_id: str, **kwargs):
        await self.db.execute(update(Quiz).where(Quiz.id == quiz_id).values(**kwargs))
        await self.db.commit()

    async def create_question(self, quiz_id: str, content: str, expected_concepts: list[str]) -> QuizQuestion:
        qq = QuizQuestion(
            quiz_id=quiz_id, question_content=content,
            expected_concepts_json=json.dumps(expected_concepts),
        )
        self.db.add(qq)
        await self.db.commit()
        await self.db.refresh(qq)
        return qq

    async def get_question(self, question_id: str) -> QuizQuestion | None:
        result = await self.db.execute(select(QuizQuestion).where(QuizQuestion.id == question_id))
        return result.scalar_one_or_none()

    async def update_question(self, question_id: str, **kwargs):
        await self.db.execute(update(QuizQuestion).where(QuizQuestion.id == question_id).values(**kwargs))
        await self.db.commit()

    async def get_quiz_questions(self, quiz_id: str) -> list[QuizQuestion]:
        r = await self.db.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id))
        return list(r.scalars().all())

    # --- Review Items ---
    async def create_review_item(self, goal_id: str, concept: str, flashcard_id: str | None = None) -> ReviewItem:
        ri = ReviewItem(goal_id=goal_id, concept=concept, flashcard_id=flashcard_id,
                        next_review_at=now())
        self.db.add(ri)
        await self.db.commit()
        await self.db.refresh(ri)
        return ri

    async def get_due_reviews(self, goal_id: str) -> list[ReviewItem]:
        now_ts = now()
        r = await self.db.execute(
            select(ReviewItem)
            .where(ReviewItem.goal_id == goal_id)
            .where(ReviewItem.next_review_at <= now_ts)
            .where(ReviewItem.status != "completed")
            .order_by(ReviewItem.next_review_at)
        )
        return list(r.scalars().all())

    async def get_review_item(self, review_id: str) -> ReviewItem | None:
        result = await self.db.execute(select(ReviewItem).where(ReviewItem.id == review_id))
        return result.scalar_one_or_none()

    async def update_review_item(self, review_id: str, **kwargs):
        await self.db.execute(update(ReviewItem).where(ReviewItem.id == review_id).values(**kwargs))
        await self.db.commit()

    # --- MindMaps ---
    async def create_mindmap(self, goal_id: str, title: str, content: str, node_count: int) -> MindMap:
        mm = MindMap(goal_id=goal_id, title=title, content=content, node_count=node_count)
        self.db.add(mm)
        await self.db.commit()
        await self.db.refresh(mm)
        return mm

    # --- Goal plan persistence ---
    async def save_goal_plan(self, goal_id: str, plan: dict) -> int:
        """
        Persist a decomposed learning plan (from GoalDecomposer) as LearningTask records.
        plan structure: {"milestones": [{"week": 1, "title": "...", "tasks": [...]}]}
        Returns the number of tasks created.
        """
        from datetime import timedelta

        goal = await self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")

        available_days = json.loads(goal.available_days_json) if goal.available_days_json else []
        day_map = {d: i for i, d in enumerate(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"])}

        count = 0
        milestones = plan.get("milestones", [])
        for milestone in milestones:
            week_num = milestone.get("week", 1)
            tasks = milestone.get("tasks", [])
            for task_def in tasks:
                day = task_def.get("day", 1)
                scheduled = datetime.now(timezone.utc) + timedelta(weeks=week_num - 1, days=day - 1)
                await self.create_learning_task(
                    goal_id=goal_id,
                    week_num=week_num,
                    day_num=day,
                    title=task_def.get("title", ""),
                    description=task_def.get("description"),
                    type=task_def.get("type", "reading"),
                    duration_min=task_def.get("duration_min", 30),
                    sort_order=task_def.get("order", 0),
                    scheduled_date=scheduled,
                )
                count += 1
        return count

    # --- Flashcard review update ---
    async def update_flashcard_review(
        self, flashcard_id: str, quality: int
    ) -> Flashcard | None:
        """Update a flashcard's SM-2 state after a review."""
        from services.spaced_repetition import SpacedRepetitionEngine

        fc = await self.get_flashcard(flashcard_id)
        if not fc:
            return None

        new_easiness, new_interval, new_reps, new_mastery, next_review = SpacedRepetitionEngine.process_review(
            quality,
            fc.easiness,
            fc.interval,
            fc.repetitions,
            fc.mastery,
        )
        await self.update_flashcard(
            flashcard_id,
            easiness=new_easiness,
            interval=new_interval,
            repetitions=new_reps,
            mastery=new_mastery,
            next_review_at=next_review,
            reviews_count=fc.reviews_count + 1,
        )
        return await self.get_flashcard(flashcard_id)

    # --- Review item update ---
    async def update_review_item_review(
        self, review_id: str, quality: int
    ) -> ReviewItem | None:
        """Update a review item's SM-2 state after feedback."""
        from services.spaced_repetition import SpacedRepetitionEngine

        ri = await self.get_review_item(review_id)
        if not ri:
            return None

        new_easiness, new_interval, new_reps, new_mastery, next_review = SpacedRepetitionEngine.process_review(
            quality,
            ri.easiness,
            ri.interval,
            ri.repetitions,
            ri.mastery,
        )
        await self.update_review_item(
            review_id,
            easiness=new_easiness,
            interval=new_interval,
            repetitions=new_reps,
            mastery=new_mastery,
            last_reviewed=datetime.now(timezone.utc),
            next_review_at=next_review,
            status="completed" if new_mastery >= 0.9 else "pending",
        )
        return await self.get_review_item(review_id)

    # --- Save weak points from quiz ---
    async def save_weak_points(
        self, goal_id: str, weak_points: list[dict]
    ) -> list[ReviewItem]:
        """Create ReviewItem records for each weak point identified from quiz feedback."""
        items = []
        for wp in weak_points:
            item = await self.create_review_item(
                goal_id=goal_id,
                concept=wp.get("concept", ""),
                flashcard_id=wp.get("flashcard_id"),
            )
            # Set initial mastery from the weak point data
            if "mastery" in wp:
                await self.update_review_item(
                    item.id,
                    mastery=wp["mastery"],
                )
            items.append(item)
        return items

    # --- Update goal plan_json directly ---
    async def set_goal_plan_json(self, goal_id: str, plan: dict) -> None:
        await self.update_goal(goal_id, plan_json=json.dumps(plan))

