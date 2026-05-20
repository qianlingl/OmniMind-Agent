from pydantic import BaseModel


class FileWriteRequest(BaseModel):
    content: str
    append: bool = False


class FileContentResponse(BaseModel):
    file_id: str
    content: str
    encoding: str = "utf-8"


class BatchRenameItem(BaseModel):
    old_name: str
    new_name: str


class BatchRenameRequest(BaseModel):
    files: list[BatchRenameItem]
    directory: str = "/"


class BatchRenameResponse(BaseModel):
    success: bool
    renamed_count: int = 0
    errors: list[str] = []


class FileListResponse(BaseModel):
    path: str
    files: list[dict]


class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int = 0
    type: str = "unknown"
    uploaded_at: str = ""
