from services.llm_client import count_tokens, chat


async def compress_context(messages: list[dict], max_tokens: int = 65536) -> list[dict]:
    if not messages:
        return messages
    total = sum(count_tokens(m["content"]) for m in messages if m.get("content"))
    if total <= max_tokens:
        return messages

    system_msgs = [m for m in messages if m["role"] == "system"]
    conv_msgs = [m for m in messages if m["role"] != "system"]

    keep_count = max(2, int(len(conv_msgs) * 0.3))
    keep_msgs = conv_msgs[-keep_count:] if keep_count > 0 else []
    drop_msgs = conv_msgs[:-keep_count] if keep_count > 0 else conv_msgs

    summary = await _generate_summary(drop_msgs)
    result = system_msgs + ([{"role": "system", "content": summary}] if summary else []) + keep_msgs
    return result


async def _generate_summary(messages: list[dict]) -> str:
    if not messages:
        return ""
    prompt = [
        {"role": "system", "content": "Summarize the following conversation. Preserve: (1) key entities, (2) decisions made, (3) task status, (4) user preferences. Output as concise bullet points in the original language."},
        {"role": "user", "content": "\n".join(f"[{m['role']}]: {m['content'][:1000]}" for m in messages if m.get("content"))},
    ]
    try:
        return await chat(prompt, temperature=0.3, max_tokens=1024)
    except Exception:
        return "Previous conversation: " + " ".join(m["content"][:100] for m in messages[-3:] if m.get("content"))
