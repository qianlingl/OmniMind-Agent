import os
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.file_repo import FileRepo
from config import settings


class FileService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = FileRepo(db)

    def _safe_path(self, relative_path: str) -> str:
        """Resolve and sandbox to workspace."""
        workspace = os.path.realpath(settings.workspace_dir)
        full = os.path.realpath(os.path.join(workspace, relative_path.lstrip("/")))
        if not full.startswith(workspace):
            raise PermissionError("Path traversal denied")
        return full

    async def upload(self, filename: str, content: bytes, session_id: str | None = None) -> dict:
        os.makedirs(settings.workspace_dir, exist_ok=True)
        file_id = uuid.uuid4().hex[:12]
        ext = os.path.splitext(filename)[1].lower()
        file_type = ext.lstrip(".") if ext else "unknown"
        relative_path = f"{file_id}/{filename}"
        full_path = self._safe_path(relative_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        doc = await self.repo.create(filename, file_type, relative_path, len(content), session_id)
        return {
            "file_id": doc.id,
            "filename": doc.filename,
            "size": doc.size_bytes,
            "type": doc.file_type,
            "uploaded_at": doc.created_at.isoformat() if doc.created_at else "",
        }

    async def read(self, file_id: str) -> dict:
        doc = await self.repo.get(file_id)
        if not doc:
            return None
        full_path = self._safe_path(doc.file_path)
        if not os.path.isfile(full_path):
            return {"file_id": file_id, "content": doc.content_text or "", "encoding": "utf-8"}
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(full_path, "r", encoding="latin-1") as f:
                content = f.read()
        doc.content_text = content
        await self.db.commit()
        return {"file_id": file_id, "content": content, "encoding": "utf-8"}

    async def write(self, file_id: str, content: str, append: bool = False) -> dict:
        doc = await self.repo.get(file_id)
        if not doc:
            return None
        full_path = self._safe_path(doc.file_path)
        mode = "a" if append else "w"
        with open(full_path, mode, encoding="utf-8") as f:
            f.write(content)
        new_size = os.path.getsize(full_path)
        doc.content_text = content if not append else (doc.content_text or "") + content
        doc.size_bytes = new_size
        await self.db.commit()
        return {"success": True, "file_id": file_id, "size": new_size}

    async def delete(self, file_id: str) -> bool:
        return await self.repo.delete(file_id)

    async def batch_rename(self, files: list[dict], directory: str = "/") -> dict:
        errors = []
        renamed = 0
        for item in files:
            old_path = os.path.join(directory, item["old_name"]).lstrip("/")
            new_path = os.path.join(directory, item["new_name"]).lstrip("/")
            old_full = self._safe_path(old_path)
            new_full = self._safe_path(new_path)
            if os.path.isfile(old_full):
                os.rename(old_full, new_full)
                renamed += 1
            else:
                errors.append(f"File not found: {item['old_name']}")
        return {"success": len(errors) == 0, "renamed_count": renamed, "errors": errors}

    async def list_dir(self, path: str = "") -> dict:
        entries = await self.repo.list_dir(path)
        return {"path": path or "/", "files": entries}
