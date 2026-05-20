from pydantic import BaseModel


class TaskCreate(BaseModel):
    session_id: str | None = None
    type: str = "code_development"
    description: str
    requirements: list[str] = []
    priority: str = "medium"


class TaskResponse(BaseModel):
    task_id: str
    status: str
    created_at: str | None = None


class SubTaskInfo(BaseModel):
    name: str
    status: str
    agent_type: str = ""
    result: str = ""


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: int = 0
    sub_tasks: list[SubTaskInfo] = []
    results: dict | None = None
