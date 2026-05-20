import json
import uuid
import asyncio
from services.llm_client import chat, extract_json


class QuizEngine:

    async def start_quiz(self, topic: str, question_count: int, learned_concepts: list[str]) -> dict:
        tasks = [self._generate_question(topic, learned_concepts) for _ in range(question_count)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        questions = []
        for r in results:
            if isinstance(r, Exception):
                questions.append(self._fallback_question(topic))
            else:
                questions.append(r)
        return questions

    async def _generate_question(self, topic: str, learned_concepts: list[str]) -> dict:
        concepts_str = ", ".join(learned_concepts[:20]) if learned_concepts else "basic concepts"
        prompt = f"""Generate an open-ended question about {topic} for a student who has learned: {concepts_str}.

Output JSON:
{{
  "content": "The question text",
  "expected_concepts": ["concept1", "concept2", "concept3"]
}}

Requirements:
- Test understanding, not memorization
- Ask the student to explain or give examples
- Output ONLY the JSON, no other text."""

        try:
            response = await chat([{"role": "user", "content": prompt}], temperature=0.7, max_tokens=512)
            data = await extract_json(response)
            return {
                "question_id": uuid.uuid4().hex[:12],
                "type": "open_ended",
                "content": data.get("content", ""),
                "expected_concepts": data.get("expected_concepts", []),
            }
        except Exception:
            return self._fallback_question(topic)

    def _fallback_question(self, topic: str) -> dict:
        return {
            "question_id": uuid.uuid4().hex[:12],
            "type": "open_ended",
            "content": f"Explain the key concepts of {topic} and give an example.",
            "expected_concepts": [],
        }

    async def evaluate_answer(self, question: str, expected_concepts: list[str], user_answer: str) -> dict:
        prompt = f"""Evaluate this student answer.

Question: {question}
Expected key concepts: {', '.join(expected_concepts)}
Student Answer: {user_answer}

Output JSON:
{{
  "score": <0-5>,
  "missing_concepts": ["concept1", ...],
  "feedback": "<encouraging, specific feedback under 200 words>"
}}

Scoring: 5=perfect, 4=good with minor gaps, 3=adequate but missing key points, 2=significant gaps, 1=very little correct, 0=completely wrong.
Output ONLY the JSON."""

        try:
            response = await chat([{"role": "user", "content": prompt}], temperature=0.3, max_tokens=512)
            data = await extract_json(response)
            return {
                "score": max(0, min(5, int(data.get("score", 3)))),
                "missing_concepts": data.get("missing_concepts", []),
                "feedback": data.get("feedback", "Keep going!"),
            }
        except Exception:
            return {"score": 3, "missing_concepts": [], "feedback": "Good effort! Keep learning."}

    async def extract_weak_points(self, score: int, missing_concepts: list[str]) -> list[dict]:
        weak_points = []
        if score < 4:
            for concept in missing_concepts:
                weak_points.append({"concept": concept, "mastery": max(0.1, score / 5.0)})
        return weak_points
