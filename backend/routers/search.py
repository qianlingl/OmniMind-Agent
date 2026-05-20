from fastapi import APIRouter, Depends
from dependencies import verify_api_key
from services.search_service import SearchService
from schemas.search import SearchRequest, AutoSearchRequest

router = APIRouter(tags=["Search"])


@router.post("/search", dependencies=[Depends(verify_api_key)])
async def do_search(body: SearchRequest):
    svc = SearchService()
    return await svc.search(body.query, body.engine, body.max_results)


@router.post("/search/auto", dependencies=[Depends(verify_api_key)])
async def auto_search(body: AutoSearchRequest):
    svc = SearchService()
    return await svc.auto_search(body.query, body.session_id)
