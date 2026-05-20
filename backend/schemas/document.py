from pydantic import BaseModel


class DocumentParseRequest(BaseModel):
    file_id: str
    options: dict | None = None


class DocumentParseResponse(BaseModel):
    file_id: str
    content: str
    tables: list[dict] = []
    metadata: dict | None = None


class UrlParseRequest(BaseModel):
    url: str
    extract_images: bool = False


class UrlParseResponse(BaseModel):
    url: str
    title: str = ""
    content: str = ""
    metadata: dict | None = None
