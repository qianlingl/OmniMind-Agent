from datetime import datetime
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str
    engine: str = "bing"
    max_results: int = Field(default=10, ge=1, le=100)


class SearchResult(BaseModel):
    title: str
    url: str
    summary: str
    published_at: datetime | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult] = []
    total_results: int = 0


class AutoSearchRequest(BaseModel):
    query: str
    session_id: str | None = None


class AutoSearchResponse(BaseModel):
    triggered: bool
    query: str
    results: list[SearchResult] = []
