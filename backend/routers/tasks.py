from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from dependencies import get_db, verify_api_key
from services.orchestrator import Orchestrator
from schemas.task import TaskCreate

router = APIRouter(tags=["Tasks"])


@router.post("/tasks", dependencies=[Depends(verify_api_key)])
async def create_task(body: TaskCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    orch = Orchestrator(db)
    result = await orch.create_task(body.session_id, body.type, body.description, body.requirements)
    background_tasks.add_task(Orchestrator(db).execute_task, result["task_id"])
    return result


@router.get("/tasks/{task_id}", dependencies=[Depends(verify_api_key)])
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    orch = Orchestrator(db)
    result = await orch.get_status(task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@router.post("/tasks/{task_id}/cancel", dependencies=[Depends(verify_api_key)])
async def cancel_task(task_id: str, db: AsyncSession = Depends(get_db)):
    orch = Orchestrator(db)
    ok = await orch.cancel_task(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "message": "Task cancelled"}
