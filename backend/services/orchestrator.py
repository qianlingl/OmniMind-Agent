import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.task_repo import TaskRepo
from services.llm_client import chat

logger = logging.getLogger(__name__)


class Orchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.task_repo = TaskRepo(db)

    async def create_task(self, session_id: str | None, type: str, description: str, requirements: list[str]) -> dict:
        task = await self.task_repo.create(session_id, type, description, requirements)
        return {"task_id": task.id, "status": task.status, "created_at": task.created_at.isoformat() if task.created_at else ""}

    async def get_status(self, task_id: str) -> dict:
        task = await self.task_repo.get(task_id)
        if not task:
            return None
        subtasks = await self.task_repo.get_subtasks(task_id)
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
        task = await self.task_repo.get(task_id)
        if not task:
            return False
        await self.task_repo.update_status(task_id, "cancelled")
        return True

    async def execute_task(self, task_id: str):
        """Execute a task using prompt-based multi-agent routing."""
        task = await self.task_repo.get(task_id)
        if not task:
            return

        await self.task_repo.update_status(task_id, "running", 5)
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
            await self.task_repo.create_subtask(task_id, st["agent_type"], st["description"])

        await self.task_repo.update_status(task_id, "running", 20)

        # Step 2: Execute each subtask
        results = {"code": "", "tests": "", "docs": ""}
        agent_prompts = {
            "code": "You are an expert software developer. Write production-quality code.",
            "test": "You are a QA engineer. Write comprehensive test cases.",
            "doc": "You are a technical writer. Write clear documentation.",
        }

        for i, st in enumerate(subtasks):
            agent_type = st["agent_type"]
            system_prompt = agent_prompts.get(agent_type, agent_prompts["code"])
            try:
                agent_result = await chat([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Task: {st['description']}\nContext: {json.dumps(results)}"},
                ])
                results[agent_type] = (results.get(agent_type, "") + "\n" + agent_result).strip()
                await self.task_repo.update_subtask(
                    await self._get_subtask_id(task_id, st["description"]),
                    "completed",
                    agent_result,
                )
            except Exception as e:
                logger.warning(f"Agent {agent_type} failed for subtask {st['description']}: {e}")
                await self.task_repo.update_subtask(
                    await self._get_subtask_id(task_id, st["description"]),
                    "failed",
                    f"Error: {e}",
                )
            pct = 20 + int((i + 1) / len(subtasks) * 70)
            await self.task_repo.update_status(task_id, "running", pct)

        await self.task_repo.update_status(task_id, "completed", 100, json.dumps(results))

    async def _get_subtask_id(self, task_id: str, description: str) -> str:
        subtasks = await self.task_repo.get_subtasks(task_id)
        for st in subtasks:
            if st.name == description:
                return st.id
        # Fallback: return first subtask if description match fails
        if subtasks:
            logger.warning(f"No subtask found for description '{description}', using first subtask")
            return subtasks[0].id
        return ""
