class AppException(Exception):
    status_code: int = 500
    detail: str = "Internal server error"

    def __init__(self, detail: str = "", status_code: int | None = None):
        self.detail = detail or self.detail
        if status_code is not None:
            self.status_code = status_code


class NotFound(AppException):
    status_code = 404
    detail = "Resource not found"


class PermissionDenied(AppException):
    status_code = 403
    detail = "Permission denied"


class Unauthorized(AppException):
    status_code = 401
    detail = "Unauthorized"


class ValidationError(AppException):
    status_code = 422
    detail = "Validation error"


class LLMError(AppException):
    status_code = 502
    detail = "LLM service error"
