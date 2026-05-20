import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.session_repo import SessionRepo
from repositories.memory_repo import MemoryRepo
from vector_store.chroma_store import add_memory, search_memories
from services.llm_client import chat, chat_stream, count_tokens
from core.context_compressor import compress_context

logger = logging.getLogger(__name__)


class DialogueService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.session_repo = SessionRepo(db)
        self.memory_repo = MemoryRepo(db)

    async def create_session(self, user_id: str | None = None, metadata: dict | None = None) -> dict:
        title = "New Session"
        if metadata and metadata.get("title"):
            title = metadata["title"]
        session = await self.session_repo.create(user_id, title)
        return {
            "session_id": session.id,
            "created_at": session.created_at.isoformat() if session.created_at else "",
            "metadata": metadata or {},
        }

    async def list_sessions(self, user_id: str | None = None, skip: int = 0, limit: int = 20) -> dict:
        sessions, total = await self.session_repo.list_by_user(user_id, skip, limit)
        return {"sessions": sessions, "total": total, "skip": skip, "limit": limit}

    async def get_session(self, session_id: str) -> dict:
        session = await self.session_repo.get(session_id)
        if not session:
            return None
        messages = await self.session_repo.get_messages(session_id)
        return {"session_id": session.id, "messages": messages}

    async def delete_session(self, session_id: str) -> bool:
        return await self.session_repo.delete(session_id)

    async def send_message(self, session_id: str, content: str, enable_search: bool = False,
                           use_memory: bool = True) -> dict:
        from services.search_service import SearchService

        session = await self.session_repo.get(session_id)
        if not session:
            return None

        await self.session_repo.add_message(session_id, "user", content, token_count=count_tokens(content))

        msgs = await self.session_repo.get_messages_orm(session_id)
        messages = [{"role": "system", "content": "You are OmniMind-Agent, a helpful AI assistant."}]
        messages += [{"role": m.role, "content": m.content} for m in msgs]

        sources = []

        # Memory retrieval
        if use_memory:
            mem_results = await search_memories(content, top_k=3)
            if mem_results:
                memory_context = "\n".join(m["content"] for m in mem_results)
                messages.insert(1, {"role": "system", "content": f"Relevant memories:\n{memory_context}"})
                sources.extend({"type": "memory", "id": m["memory_id"]} for m in mem_results)

        # Search (only when explicitly enabled)
        if enable_search:
            try:
                svc = SearchService()
                search_results = await svc.search(content, max_results=5)
                if search_results.get("results"):
                    search_context = "\n".join(
                        f"- {r['title']}: {r['summary']}" for r in search_results["results"]
                    )
                    messages.insert(-1, {"role": "system", "content": f"Web search results:\n{search_context}"})
                    sources.extend({"type": "search", "title": r["title"]} for r in search_results["results"])
            except Exception as e:
                logger.warning(f"Search failed during send_message: {e}")

        # Context compression
        messages = await compress_context(messages, session.context_window)

        # LLM
        response = await chat(messages)
        token_count = count_tokens(response)

        msg = await self.session_repo.add_message(session_id, "assistant", response, token_count=token_count)

        # Auto-save facts to memory
        await self._extract_and_save_memories(content, response, session_id)

        return {
            "message_id": msg.id,
            "role": "assistant",
            "content": response,
            "timestamp": msg.created_at.isoformat() if msg.created_at else "",
            "sources": sources,
        }

    async def send_message_stream(self, session_id: str, content: str, use_memory: bool = True):
        session = await self.session_repo.get(session_id)
        if not session:
            return

        await self.session_repo.add_message(session_id, "user", content, token_count=count_tokens(content))

        msgs = await self.session_repo.get_messages_orm(session_id)
        messages = [{"role": "system", "content": "You are OmniMind-Agent, a helpful AI assistant."}]
        messages += [{"role": m.role, "content": m.content} for m in msgs]

        if use_memory:
            mem_results = await search_memories(content, top_k=3)
            if mem_results:
                memory_context = "\n".join(m["content"] for m in mem_results)
                messages.insert(1, {"role": "system", "content": f"Relevant memories:\n{memory_context}"})

        messages = await compress_context(messages, session.context_window)

        full_response = ""
        async for token in chat_stream(messages):
            full_response += token
            yield token

        await self.session_repo.add_message(session_id, "assistant", full_response, token_count=count_tokens(full_response))
        await self._extract_and_save_memories(content, full_response, session_id)

    async def _extract_and_save_memories(self, user_msg: str, assistant_msg: str, session_id: str):
        try:
            prompt = [
                {"role": "system", "content": "Extract important user facts or preferences from this conversation. Output a JSON list of strings, each being a concise fact. If nothing notable, output empty list."},
                {"role": "user", "content": f"User: {user_msg[:500]}\nAssistant: {assistant_msg[:500]}"},
            ]
            result = await chat(prompt, temperature=0.3, max_tokens=512, response_format="json_object")
            data = json.loads(result)
            if isinstance(data, list):
                facts = data
            elif isinstance(data, dict):
                facts = data.get("facts", [])
            else:
                facts = []
            if isinstance(facts, list):
                for fact in facts[:3]:
                    mem = await self.memory_repo.create(type="fact", content=str(fact), session_id=session_id)
                    await add_memory(mem.id, str(fact))
        except Exception as e:
            logger.warning(f"Failed to extract/save memories for session {session_id}: {e}")
