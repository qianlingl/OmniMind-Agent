import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.task_repo import TaskRepo
from services.llm_client import chat

logger = logging.getLogger(__name__)


class Orchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_task(self, session_id: str | None, type: str, description: str, requirements: list[str]) -> dict:
        task_repo = TaskRepo(self.db)
        task = await task_repo.create(session_id, type, description, requirements)
        return {"task_id": task.id, "status": task.status, "created_at": task.created_at.isoformat() if task.created_at else ""}

    async def get_status(self, task_id: str) -> dict:
        task_repo = TaskRepo(self.db)
        task = await task_repo.get(task_id)
        if not task:
            return None
        subtasks = await task_repo.get_subtasks(task_id)
        sub_list = [
            {
                "name": s.name,
                "status": s.status,
                "agent_type": s.agent_type,
                "result": s.result or "",
            }
            for s in subtasks
        ]
        results = json.loads(task.results_json) if task.results_json else None
        return {
            "task_id": task.id,
            "status": task.status,
            "progress": task.progress_pct,
            "sub_tasks": sub_list,
            "results": results,
        }

    async def cancel_task(self, task_id: str) -> bool:
        task_repo = TaskRepo(self.db)
        task = await task_repo.get(task_id)
        if not task:
            return False
        await task_repo.update_status(task_id, "cancelled")
        return True

    async def execute_task(self, task_id: str, session_id: str | None = None):
        """Execute a task using prompt-based multi-agent routing.
        The DB session (self.db) must be provided by the caller.
        """
        task_repo = TaskRepo(self.db)
        task = await task_repo.get(task_id)
        if not task:
            return

        await task_repo.update_status(task_id, "running", 5)
        requirements = json.loads(task.requirements_json) if task.requirements_json else []

        # Step 1: Decompose
        decompose_prompt = [
            {"role": "system", "content": "You are a project manager. Decompose the following task into subtasks. Output a JSON object with a 'subtasks' array. Each subtask has 'agent_type' (code/test/doc) and 'description'."},
            {"role": "user", "content": f"Task: {task.description}\nRequirements: {requirements}\n\nOutput JSON only."},
        ]
        try:
            result = await chat(decompose_prompt, temperature=0.3, max_tokens=1024)
            data = json.loads(result) if isinstance(result, str) else result
            subtasks = data.get("subtasks", [])
            if not subtasks:
                subtasks = [{"agent_type": "code", "description": task.description}]
        except Exception as e:
            logger.warning(f"Task decomposition failed for {task_id}: {e}")
            subtasks = [{"agent_type": "code", "description": task.description}]

        for st in subtasks:
            await task_repo.create_subtask(task_id, st["agent_type"], st["description"])

        await task_repo.update_status(task_id, "running", 20)

        # Step 2: Execute each subtask
        results = {"code": "", "tests": "", "docs": ""}
        agent_prompts = {
            "code": "You are an expert software developer. Write production-quality code.",
            "test": "You are a QA engineer. Write comprehensive test cases.",
            "doc": "You are a technical writer. Write clear documentation.",
        }

        subtask_cache: dict[str, str] = {}

        for i, st in enumerate(subtasks):
            agent_type = st["agent_type"]
            system_prompt = agent_prompts.get(agent_type, agent_prompts["code"])
            try:
                agent_result = await chat([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Task: {st['description']}\nContext: {json.dumps(results)}"},
                ])
                results[agent_type] = (results.get(agent_type, "") + "\n" + agent_result).strip()
                if st["description"] not in subtask_cache:
                    sub_list = await task_repo.get_subtasks(task_id)
                    for s in sub_list:
                        if s.name == st["description"]:
                            subtask_cache[st["description"]] = s.id
                            break
                sub_id = subtask_cache.get(st["description"])
                if sub_id:
                    await task_repo.update_subtask(sub_id, "completed", agent_result)
            except Exception as e:
                logger.warning(f"Agent {agent_type} failed for subtask {st['description']}: {e}")
                if st["description"] not in subtask_cache:
                    sub_list = await task_repo.get_subtasks(task_id)
                    for s in sub_list:
                        if s.name == st["description"]:
                            subtask_cache[st["description"]] = s.id
                            break
                sub_id = subtask_cache.get(st["description"])
                if sub_id:
                    await task_repo.update_subtask(sub_id, "failed", f"Error: {e}")
            pct = 20 + int((i + 1) / len(subtasks) * 70)
            await task_repo.update_status(task_id, "running", pct)

        await task_repo.update_status(task_id, "completed", 100, json.dumps(results))
