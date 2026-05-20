from datetime import datetime
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    user_id: str | None = None
    metadata: dict | None = None


class Message(BaseModel):
    role: str
    content: str
    timestamp: datetime | None = None


class MessageResponse(BaseModel):
    message_id: str
    role: str
    content: str
    timestamp: datetime
    sources: list[dict] = []


class SessionResponse(BaseModel):
    session_id: str
    created_at: datetime
    last_active: datetime | None = None
    message_count: int = 0
    metadata: dict | None = None


class SessionBrief(BaseModel):
    session_id: str
    created_at: datetime
    last_active: datetime | None = None
    message_count: int = 0


class SessionListResponse(BaseModel):
    sessions: list[SessionBrief]


class MessageSend(BaseModel):
    content: str
    files: list[str] = Field(default_factory=list)
    enable_search: bool = False
    use_memory: bool = True


class SessionDetail(BaseModel):
    session_id: str
    messages: list[Message]
