from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, Float, ForeignKey, Boolean, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from models import Base
from models.session import gen_id, now


class LearningGoal(Base):
    __tablename__ = "learning_goals"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_id)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(String(256))
    subject: Mapped[str | None] = mapped_column(String(64), nullable=True)
    topic: Mapped[str | None] = mapped_column(String(128), nullable=True)
    level: Mapped[str] = mapped_column(String(20), default="beginner")
    daily_minutes: Mapped[int] = mapped_column(Integer, default=60)
    duration_weeks: Mapped[int] = mapped_column(Integer, default=12)
    available_days_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    progress_pct: Mapped[float] = mapped_column(Float, default=0.0)
    current_week: Mapped[int] = mapped_column(Integer, default=1)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    plan_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_learning_goals_user_id", "user_id"),
    )


class LearningTask(Base):
    __tablename__ = "learning_tasks"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_id)
    goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("learning_goals.id", ondelete="CASCADE"))
    week_num: Mapped[int] = mapped_column(Integer)
    day_num: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(20), default="reading")
    duration_min: Mapped[int] = mapped_column(Integer, default=30)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    scheduled_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    actual_duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_learning_tasks_goal_date", "goal_id", "scheduled_date"),
        Index("ix_learning_tasks_goal_status", "goal_id", "status"),
        UniqueConstraint("goal_id", "week_num", "day_num", "sort_order", name="uq_learning_task_daily_order"),
    )


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_id)
    goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("learning_goals.id", ondelete="CASCADE"))
    front: Mapped[str] = mapped_column(Text)
    back: Mapped[str] = mapped_column(Text)
    concept: Mapped[str | None] = mapped_column(String(256), nullable=True)
    tags_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    mastery: Mapped[float] = mapped_column(Float, default=0.5)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0)
    easiness: Mapped[float] = mapped_column(Float, default=2.5)
    interval: Mapped[int] = mapped_column(Integer, default=1)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_flashcards_goal_review", "goal_id", "next_review_at"),
        Index("ix_flashcards_concept", "concept"),
        Index("ix_flashcards_goal_mastery", "goal_id", "mastery"),
    )


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_id)
    goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("learning_goals.id", ondelete="CASCADE"))
    topic: Mapped[str | None] = mapped_column(String(256), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_id)
    quiz_id: Mapped[str] = mapped_column(String(32), ForeignKey("quizzes.id", ondelete="CASCADE"))
    question_content: Mapped[str] = mapped_column(Text)
    expected_concepts_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    missing_concepts_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ReviewItem(Base):
    __tablename__ = "review_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_id)
    goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("learning_goals.id", ondelete="CASCADE"))
    flashcard_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("flashcards.id"), nullable=True)
    concept: Mapped[str] = mapped_column(String(256))
    mastery: Mapped[float] = mapped_column(Float, default=0.5)
    easiness: Mapped[float] = mapped_column(Float, default=2.5)
    interval: Mapped[int] = mapped_column(Integer, default=1)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_review_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_review_items_goal_next", "goal_id", "next_review_at"),
    )


class MindMap(Base):
    __tablename__ = "mindmaps"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_id)
    goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("learning_goals.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(256))
    format: Mapped[str] = mapped_column(String(20), default="mermaid")
    content: Mapped[str] = mapped_column(Text)
    node_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_id)
    key_hash: Mapped[str] = mapped_column(String(128), unique=True)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
