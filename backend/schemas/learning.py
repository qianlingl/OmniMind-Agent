from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class TaskLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class TaskType(str, Enum):
    reading = "reading"
    practice = "practice"
    review = "review"
    quiz = "quiz"


class QuizStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"


class ReviewStatus(str, Enum):
    pending = "pending"
    completed = "completed"


class GoalCreate(BaseModel):
    title: str
    subject: str | None = None
    topic: str | None = None
    level: TaskLevel = TaskLevel.beginner
    daily_minutes: int = Field(default=60, ge=1)
    duration_weeks: int = Field(default=12, ge=1)
    available_days: list[str] = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    notes: str | None = None


class TaskUpdate(BaseModel):
    task_id: str | None = None
    status: str
    actual_duration_min: int | None = Field(default=None, ge=0)


class LearningStats(BaseModel):
    tasks_completed: int
    tasks_total: int
    study_minutes: int
    quiz_avg_score: float
    reviews_completed: int
    new_concepts_learned: int
    streak_days: int
    mastery_overall: float


class MasteryByTopic(BaseModel):
    topic: str
    mastery: float


class StudyDay(BaseModel):
    date: str
    minutes: int
    tasks: int


class LearningReportResponse(BaseModel):
    goal_id: str
    period: str
    stats: LearningStats
    mastery_by_topic: list[MasteryByTopic] = []
    weak_points: list[str] = []
    study_calendar: list[StudyDay] = []


class FlashcardResponse(BaseModel):
    flashcard_id: str
    front: str
    back: str
    tags: list[str] = []
    concept: str | None = None
    mastery: float = Field(ge=0.0, le=1.0)
    reviews_count: int = 0
    next_review_at: datetime | None = None


class ReviewItemResponse(BaseModel):
    review_id: str
    concept: str
    mastery: float
    last_reviewed: datetime | None = None
    interval_days: int = 1
    status: str
    new_interval_days: int = 0
    next_review_at: datetime | None = None
    easiness: float = 2.5


class GoalResponse(BaseModel):
    goal_id: str
    title: str
    status: str
    plan: dict | None = None
    progress_pct: float = 0.0
    streak_days: int = 0
    created_at: datetime | None = None


class GoalDetail(BaseModel):
    goal_id: str
    title: str
    status: str
    progress_pct: float
    current_week: int
    current_milestone: dict | None = None
    streak_days: int
    total_study_minutes: int = 0


class QuizStartRequest(BaseModel):
    topic: str | None = None
    question_count: int = Field(default=3, ge=1, le=20)


class QuizStartResponse(BaseModel):
    quiz_id: str
    questions: list[dict]


class QuizAnswerRequest(BaseModel):
    question_id: str
    answer: str


class QuizAnswerResponse(BaseModel):
    question_id: str
    score: int = Field(ge=0, le=5)
    max_score: int = 5
    feedback: str
    missing_concepts: list[str] = []
    weak_points: list[dict] = []
    next_review_at: datetime | None = None


class ReviewFeedbackRequest(BaseModel):
    quality: int = Field(ge=0, le=5)
    response_time_ms: int | None = Field(default=None, ge=0)


class FlashcardBatchResponse(BaseModel):
    batch_id: str
    source: str
    flashcards: list[FlashcardResponse]
    generated_count: int
    created_at: datetime | None = None


class MindMapGenerateRequest(BaseModel):
    source_type: str = "goal_topics"
    scope: str = "current_week"
    include_mastery: bool = True


class MindMapResponse(BaseModel):
    mindmap_id: str
    title: str
    format: str = "mermaid"
    content: str
    node_count: int = 0
    generated_at: datetime | None = None
