import json
from datetime import datetime, timedelta, timezone
from services.llm_client import chat, extract_json


class GoalDecomposer:
    async def decompose(self, title: str, topic: str | None, level: str, daily_minutes: int,
                        duration_weeks: int, available_days: list[str], notes: str | None) -> dict:
        prompt = self._build_prompt(title, topic, level, daily_minutes, duration_weeks, available_days, notes)

        for attempt in range(3):
            try:
                response = await chat(
                    [{"role": "user", "content": prompt}],
                    temperature=0.5,
                    max_tokens=4096,
                )
                plan = await extract_json(response)
                if self._validate_plan(plan, duration_weeks, available_days, daily_minutes):
                    return plan
            except Exception:
                if attempt == 2:
                    return self._fallback_plan(title, topic, level, daily_minutes, duration_weeks, available_days)
        return self._fallback_plan(title, topic, level, daily_minutes, duration_weeks, available_days)

    def _build_prompt(self, title, topic, level, daily_minutes, duration_weeks, available_days, notes):
        return f"""You are an expert curriculum designer. Decompose the following learning goal into a structured plan.

GOAL: {title}
TOPIC: {topic or title}
LEVEL: {level}
TIME: {daily_minutes} minutes/day, {duration_weeks} weeks, on {', '.join(available_days)}
NOTES: {notes or 'None'}

Output a JSON object with this exact structure:
{{
  "milestones": [
    {{
      "week": 1,
      "title": "Week topic name",
      "tasks": [
        {{"day": 1, "title": "Specific task title", "type": "reading|practice|review", "duration_min": 30}}
      ]
    }}
  ],
  "total_tasks": N,
  "estimates": {{"reading_min": N, "practice_min": N}}
}}

Rules:
- Each day's tasks must sum to exactly {daily_minutes} minutes.
- Only create tasks for {', '.join(available_days)}.
- For week 1 day 1 on {available_days[0] if available_days else 'monday'}, that's day_num=1.
- Include review tasks every 5th learning day.
- Start from absolute basics if level is beginner.
- Output ONLY the JSON, no markdown, no explanation."""

    def _validate_plan(self, plan: dict, duration_weeks: int, available_days: list[str], daily_minutes: int) -> bool:
        if not isinstance(plan.get("milestones"), list):
            return False
        if len(plan["milestones"]) != duration_weeks:
            return False
        for ms in plan["milestones"]:
            for task in ms.get("tasks", []):
                if not isinstance(task.get("title"), str):
                    return False
                if task.get("type") not in ("reading", "practice", "review"):
                    return False
                if not isinstance(task.get("duration_min"), (int, float)):
                    return False
        return True

    def _fallback_plan(self, title: str, topic: str | None, level: str, daily_minutes: int,
                       duration_weeks: int, available_days: list[str]) -> dict:
        """Generate a simple template-based plan when LLM decomposition fails."""
        topics = [
            "Introduction and Setup", "Core Concepts Part 1", "Core Concepts Part 2",
            "Intermediate Topics", "Advanced Foundations", "Applied Practice",
            "Deep Dive: Methods and Patterns", "Tools and Ecosystem",
            "Best Practices", "Integration and Projects", "Performance and Optimization",
            "Review and Next Steps",
        ]
        milestones = []
        task_count = 0
        start_date = datetime.now(timezone.utc)

        day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        day_indexes = [i for i, d in enumerate(day_names) if d in available_days]
        if not day_indexes:
            day_indexes = [0, 1, 2, 3, 4]

        for week in range(1, duration_weeks + 1):
            top_name = topics[(week - 1) % len(topics)]
            tasks = []
            for day_order, day_idx in enumerate(day_indexes):
                day_num = day_order + 1
                is_review = day_num % 5 == 0
                tasks.append({
                    "day": day_num,
                    "title": f"Review of week {week}" if is_review else f"{top_name} - Session {day_num}",
                    "type": "review" if is_review else "reading",
                    "duration_min": daily_minutes // 2,
                })
                tasks.append({
                    "day": day_num,
                    "title": "Practice exercises" if not is_review else "Self-assessment quiz",
                    "type": "practice",
                    "duration_min": daily_minutes - daily_minutes // 2,
                })
                task_count += 2
            milestones.append({"week": week, "title": top_name, "tasks": tasks})

        return {
            "milestones": milestones,
            "total_tasks": task_count,
            "estimates": {"reading_min": task_count * daily_minutes // 2, "practice_min": task_count * daily_minutes // 2},
        }
