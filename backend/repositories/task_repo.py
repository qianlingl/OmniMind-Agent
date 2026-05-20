import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.task import Task, SubTask, now


class TaskRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, session_id: str | None, type: str, description: str, requirements: list[str]) -> Task:
        task = Task(
            session_id=session_id,
            type=type,
            description=description,
            requirements_json=json.dumps(requirements),
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def get(self, task_id: str) -> Task | None:
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        return result.scalar_one_or_none()

    async def update_status(self, task_id: str, status: str, progress_pct: int | None = None, results_json: str | None = None):
        vals = {"status": status}
        if progress_pct is not None:
            vals["progress_pct"] = progress_pct
        if results_json is not None:
            vals["results_json"] = results_json
        if status == "completed":
            vals["completed_at"] = now()
        await self.db.execute(update(Task).where(Task.id == task_id).values(**vals))
        await self.db.commit()

    async def create_subtask(self, task_id: str, agent_type: str, name: str) -> SubTask:
        st = SubTask(task_id=task_id, agent_type=agent_type, name=name)
        self.db.add(st)
        await self.db.commit()
        await self.db.refresh(st)
        return st

    async def get_subtasks(self, task_id: str) -> list[SubTask]:
        result = await self.db.execute(select(SubTask).where(SubTask.task_id == task_id))
        return list(result.scalars().all())

    async def update_subtask(self, subtask_id: str, status: str, result: str | None = None):
        vals = {"status": status}
        if result is not None:
            vals["result"] = result
        await self.db.execute(update(SubTask).where(SubTask.id == subtask_id).values(**vals))
        await self.db.commit()
