import asyncio
import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from config import settings

_chroma_client = None
_collection = None


def get_chroma():
    global _chroma_client, _collection
    if _chroma_client is None:
        os.makedirs(settings.chroma_persist_dir, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client


def get_collection():
    global _collection
    if _collection is None:
        c = get_chroma()
        try:
            _collection = c.get_collection("memories")
        except Exception:
            _collection = c.create_collection("memories")
    return _collection


def _add_memory_sync(memory_id: str, content: str, metadata: dict | None = None):
    col = get_collection()
    col.add(documents=[content], ids=[memory_id], metadatas=[metadata or {}])


def _search_memories_sync(query: str, top_k: int = 5) -> list[dict]:
    col = get_collection()
    results = col.query(query_texts=[query], n_results=top_k)
    out = []
    if results["ids"] and results["ids"][0]:
        for i, mem_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            out.append({
                "memory_id": mem_id,
                "type": meta.get("type", "fact"),
                "content": results["documents"][0][i] if results["documents"] else "",
                "similarity": 1 - results["distances"][0][i] if results["distances"] else 0,
            })
    return out


async def add_memory(memory_id: str, content: str, metadata: dict | None = None):
    await asyncio.to_thread(_add_memory_sync, memory_id, content, metadata)


async def search_memories(query: str, top_k: int = 5) -> list[dict]:
    return await asyncio.to_thread(_search_memories_sync, query, top_k)


def _delete_memory_sync(memory_id: str):
    col = get_collection()
    try:
        col.delete(ids=[memory_id])
    except Exception:
        pass


async def delete_memory(memory_id: str):
    await asyncio.to_thread(_delete_memory_sync, memory_id)
