import json
import uuid
import logging
import asyncio
from functools import lru_cache
from openai import AsyncOpenAI
from openai import RateLimitError, APIError, APITimeoutError
from config import settings

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 120.0  # seconds
DEFAULT_MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0   # seconds


@lru_cache(maxsize=1)
def get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=settings.llm_api_key or "sk-placeholder",
        base_url=settings.llm_base_url,
        timeout=REQUEST_TIMEOUT,
    )


def _is_retriable(err: Exception) -> bool:
    return isinstance(err, (RateLimitError, APITimeoutError, APIError))


def _retry_delay(attempt: int) -> float:
    return RETRY_BASE_DELAY * (2 ** attempt)


async def chat(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    response_format: str | None = None,
    max_retries: int = DEFAULT_MAX_RETRIES,
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
    last_err: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            logger.debug(f"[{req_id}] chat request model={kwargs['model']} max_tokens={max_tokens} attempt={attempt}")
            response = await client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content or ""
            logger.debug(f"[{req_id}] chat response length={len(content)}")
            return content
        except Exception as e:
            last_err = e
            if _is_retriable(e) and attempt < max_retries:
                delay = _retry_delay(attempt)
                logger.warning(f"[{req_id}] chat attempt {attempt} failed ({type(e).__name__}), retrying in {delay:.1f}s: {e}")
                await asyncio.sleep(delay)
                continue
            logger.error(f"[{req_id}] chat failed after {attempt} attempts: {e}")
            raise

    raise last_err or RuntimeError("chat: unexpected fallthrough")


async def chat_stream(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    max_retries: int = DEFAULT_MAX_RETRIES,
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
    last_err: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            logger.debug(f"[{req_id}] chat_stream request model={kwargs['model']} attempt={attempt}")
            stream = await client.chat.completions.create(**kwargs)
            break
        except Exception as e:
            last_err = e
            if _is_retriable(e) and attempt < max_retries:
                delay = _retry_delay(attempt)
                logger.warning(f"[{req_id}] chat_stream attempt {attempt} failed ({type(e).__name__}), retrying in {delay:.1f}s: {e}")
                await asyncio.sleep(delay)
                continue
            logger.error(f"[{req_id}] chat_stream failed after {attempt} attempts: {e}")
            raise

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
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning(f"extract_json failed: {e}, text: {text[:200]}")
        return {}
