from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from dependencies import get_db, verify_api_key
from services.document_service import DocumentService
from schemas.document import DocumentParseRequest, UrlParseRequest

router = APIRouter(tags=["Documents"])


@router.post("/documents/parse", dependencies=[Depends(verify_api_key)])
async def parse_document(body: DocumentParseRequest, db: AsyncSession = Depends(get_db)):
    svc = DocumentService(db)
    result = await svc.parse(body.file_id, body.options)
    if not result:
        raise HTTPException(status_code=404, detail="File not found")
    return result


@router.post("/documents/parse-url", dependencies=[Depends(verify_api_key)])
async def parse_url(body: UrlParseRequest):
    svc = DocumentService(None)
    return await svc.parse_url(body.url, body.extract_images)
