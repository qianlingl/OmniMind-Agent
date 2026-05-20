from services.llm_client import count_tokens, chat


async def compress_context(messages: list[dict], max_tokens: int = 65536) -> list[dict]:
    total = sum(count_tokens(m["content"]) for m in messages)
    if total <= max_tokens:
        return messages

    split = int(len(messages) * 0.3)
    historical = messages[:-split] if split > 0 else []
    recent = messages[-split:] if split > 0 else messages

    summary = await _generate_summary(historical)
    return [{"role": "system", "content": summary}] + recent


async def _generate_summary(messages: list[dict]) -> str:
    if not messages:
        return ""
    prompt = [
        {"role": "system", "content": "Summarize the following conversation. Preserve: (1) key entities, (2) decisions made, (3) task status, (4) user preferences. Output as concise bullet points in the original language."},
        {"role": "user", "content": "\n".join(f"[{m['role']}]: {m['content'][:1000]}" for m in messages)},
    ]
    try:
        return await chat(prompt, temperature=0.3, max_tokens=1024)
    except Exception:
        return "Previous conversation summary: " + " ".join(m["content"][:100] for m in messages[-3:])
