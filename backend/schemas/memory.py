from pydantic import BaseModel, Field


class MemoryCreate(BaseModel):
    type: str = "fact"
    content: str
    session_id: str | None = None
    tags: list[str] = []


class MemoryResponse(BaseModel):
    memory_id: str
    type: str
    content: str
    created_at: str | None = None


class MemorySearchResult(BaseModel):
    memory_id: str
    type: str
    content: str
    similarity: float = 0.0


class MemorySearchResponse(BaseModel):
    results: list[MemorySearchResult] = []


class MemoryDetail(BaseModel):
    memory_id: str
    type: str
    content: str
    tags: list[str] = []
    created_at: str | None = None
    last_accessed: str | None = None
