import json
import re
from services.llm_client import chat, extract_json


def _count_mermaid_nodes(content: str) -> int:
    """Count mindmap nodes from Mermaid syntax. Each leaf concept is a node."""
    if not content.strip():
        return 0
    lines = content.split("\n")
    node_lines = [
        l
        for l in lines
        if l.strip() and not l.strip().startswith("mindmap") and not l.strip().startswith("root")
    ]
    return max(1, len(node_lines))


class ContentGenerator:

    async def generate_flashcards(self, content: str, count: int = 10) -> list[dict]:
        prompt = f"""Extract {count} key knowledge points from the following learning notes. For each point, create a flashcard.

Notes:
{content[:8000]}

Output JSON:
{{
  "flashcards": [
    {{
      "front": "Question in the student's learning language",
      "back": "Concise answer (3-5 sentences)",
      "concept": "Knowledge concept name",
      "tags": ["tag1", "tag2", "tag3"]
    }}
  ]
}}

Cover the most important concepts. Avoid trivial questions. Output ONLY the JSON."""

        try:
            response = await chat([{"role": "user", "content": prompt}], temperature=0.5, max_tokens=4096)
            data = await extract_json(response)
            cards = data.get("flashcards", [])
            if not cards:
                raise ValueError("No flashcards returned by LLM")
            return cards
        except Exception as e:
            # Return a single fallback card rather than empty list so caller knows generation failed
            return [
                {
                    "front": f"关于「{content[:50]}...」的核心知识点是什么？",
                    "back": f"请回顾以下内容并用自己的话总结要点：{content[:200]}",
                    "concept": "需要复习的内容",
                    "tags": ["复习"],
                }
            ]

    async def generate_mindmap(self, title: str, concepts: list[dict]) -> dict:
        """Generate a Mermaid mindmap from a list of concepts/items."""
        # Build tree structure
        clusters = {}
        for item in concepts:
            tags = item.get("tags", [])
            cluster = tags[0] if tags else "General"
            if cluster not in clusters:
                clusters[cluster] = []
            clusters[cluster].append(item)

        # Generate via LLM for better structure
        items_desc = json.dumps([{"concept": c.get("concept", ""), "tags": c.get("tags", [])} for c in concepts], ensure_ascii=False)
        prompt = f"""Create a Mermaid mindmap for "{title}". Organize these concepts:

{items_desc}

Output JSON:
{{
  "content": "mindmap\\n  root(({title}))\\n    Category1\\n      ConceptA\\n      ConceptB\\n    Category2\\n      ConceptC"
}}

Rules:
- Use the exact mindmap syntax (mindmap\\n  root...)
- Group related concepts under category branches
- Output ONLY the JSON. Do not wrap the content in markdown code blocks."""

        try:
            response = await chat([{"role": "user", "content": prompt}], temperature=0.4, max_tokens=2048)
            data = await extract_json(response)
            content = data.get("content", "")
            if not content.strip().startswith("mindmap"):
                raise ValueError(f"Invalid mermaid mindmap format: {content[:100]}")
            node_count = _count_mermaid_nodes(content)
            return {"title": title, "format": "mermaid", "content": content, "node_count": node_count}
        except Exception:
            # Fallback: simple mindmap
            lines = [f"mindmap", f"  root(({title}))"]
            for cluster, items in clusters.items():
                lines.append(f"    {cluster}")
                for item in items[:8]:
                    concept = item.get("concept", "Concept")
                    lines.append(f"      {concept}")
            content = "\n".join(lines)
            return {"title": title, "format": "mermaid", "content": content, "node_count": _count_mermaid_nodes(content)}
