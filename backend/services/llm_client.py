import json
import uuid
import logging
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)

_client = None

REQUEST_TIMEOUT = 120.0  # seconds


def get_client():
    global _client
    if _client is None:
        api_key = settings.llm_api_key or "sk-placeholder"
        _client = AsyncOpenAI(
            api_key=api_key,
            base_url=settings.llm_base_url,
            timeout=REQUEST_TIMEOUT,
        )
    return _client


async def chat(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    response_format: str | None = None,
) -> str:
    req_id = uuid.uuid4().hex[:8]
    kwargs = dict(
        model=model or settings.llm_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    if response_format == "json_object":
        kwargs["response_format"] = {"type": "json_object"}

    client = get_client()
    logger.debug(f"[{req_id}] chat request model={kwargs['model']} max_tokens={max_tokens}")
    response = await client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content or ""
    logger.debug(f"[{req_id}] chat response length={len(content)}")
    return content


async def chat_stream(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
):
    req_id = uuid.uuid4().hex[:8]
    kwargs = dict(
        model=model or settings.llm_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    client = get_client()
    logger.debug(f"[{req_id}] chat_stream request model={kwargs['model']}")
    stream = await client.chat.completions.create(**kwargs)
    async for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            yield content


def count_tokens(text: str) -> int:
    return len(text) // 4


async def extract_json(text: str) -> dict:
    """Extract JSON from LLM response text, handling markdown code blocks."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:] if lines[0].startswith("```") else lines
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines)
    return json.loads(text)
