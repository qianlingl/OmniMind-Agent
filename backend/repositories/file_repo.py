import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from models.document import Document, now
from config import settings


class FileRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, filename: str, file_type: str, relative_path: str, size_bytes: int = 0, session_id: str | None = None) -> Document:
        doc = Document(
            filename=filename,
            file_type=file_type,
            file_path=relative_path,
            size_bytes=size_bytes,
            session_id=session_id,
        )
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        return doc

    async def get(self, file_id: str) -> Document | None:
        result = await self.db.execute(select(Document).where(Document.id == file_id))
        return result.scalar_one_or_none()

    async def get_by_path(self, file_path: str) -> Document | None:
        result = await self.db.execute(select(Document).where(Document.file_path == file_path))
        return result.scalar_one_or_none()

    async def update_content(self, file_id: str, content_text: str):
        doc = await self.get(file_id)
        if doc:
            doc.content_text = content_text
            await self.db.commit()

    async def delete(self, file_id: str) -> bool:
        doc = await self.get(file_id)
        if not doc:
            return False
        full_path = os.path.join(settings.workspace_dir, doc.file_path)
        if os.path.isfile(full_path):
            os.remove(full_path)
        await self.db.delete(doc)
        await self.db.commit()
        return True

    async def list_dir(self, dir_path: str = "") -> list[dict]:
        prefix = (dir_path + "/") if dir_path and dir_path != "/" else ""
        result = await self.db.execute(select(Document))
        all_docs = result.scalars().all()

        subdirs = set()
        files = []
        for d in all_docs:
            rel = d.file_path
            if prefix and not rel.startswith(prefix):
                continue
            rest = rel[len(prefix):]
            if "/" in rest:
                subdirs.add(rest.split("/")[0])
            else:
                files.append({"name": rest, "type": "file", "size": d.size_bytes, "file_id": d.id})
        entries = [{"name": sd, "type": "directory"} for sd in sorted(subdirs)]
        entries.extend(sorted(files, key=lambda x: x["name"]))
        return entries
