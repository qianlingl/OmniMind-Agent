from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from dependencies import get_db, verify_api_key
from services.file_service import FileService
from schemas.file import FileWriteRequest, BatchRenameRequest

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

router = APIRouter(tags=["Files"])


@router.post("/files/upload", dependencies=[Depends(verify_api_key)])
async def upload_file(file: UploadFile = File(...), session_id: str | None = Form(default=None), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)} MB")
    svc = FileService(db)
    result = await svc.upload(file.filename or "unnamed", content, session_id)
    return result


@router.get("/files/{file_id}/content", dependencies=[Depends(verify_api_key)])
async def read_file(file_id: str, db: AsyncSession = Depends(get_db)):
    svc = FileService(db)
    result = await svc.read(file_id)
    if not result:
        raise HTTPException(status_code=404, detail="File not found")
    return result


@router.put("/files/{file_id}/content", dependencies=[Depends(verify_api_key)])
async def write_file(file_id: str, body: FileWriteRequest, db: AsyncSession = Depends(get_db)):
    svc = FileService(db)
    result = await svc.write(file_id, body.content, body.append)
    if not result:
        raise HTTPException(status_code=404, detail="File not found")
    return result


@router.delete("/files/{file_id}", dependencies=[Depends(verify_api_key)])
async def delete_file(file_id: str, db: AsyncSession = Depends(get_db)):
    svc = FileService(db)
    ok = await svc.delete(file_id)
    if not ok:
        raise HTTPException(status_code=404, detail="File not found")
    return {"success": True, "message": "File deleted"}


@router.post("/files/batch/rename", dependencies=[Depends(verify_api_key)])
async def batch_rename(body: BatchRenameRequest, db: AsyncSession = Depends(get_db)):
    svc = FileService(db)
    items = [{"old_name": f.old_name, "new_name": f.new_name} for f in body.files]
    return await svc.batch_rename(items, body.directory)


@router.get("/files/list", dependencies=[Depends(verify_api_key)])
async def list_files(path: str = "", db: AsyncSession = Depends(get_db)):
    svc = FileService(db)
    return await svc.list_dir(path)
