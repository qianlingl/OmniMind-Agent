from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    code: str | None = None
    detail: dict | None = None


class SuccessResponse(BaseModel):
    success: bool = True
    message: str | None = None
