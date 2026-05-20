import httpx
from config import settings

SEARCH_TRIGGERS = ["最新", "今天", "现在", "最近", "新闻", "资讯", "报道", "天气", "股价", "汇率"]


class SearchService:
    async def search(self, query: str, engine: str = "bing", max_results: int = 10) -> dict:
        results = []
        try:
            if engine == "bing" and settings.bing_api_key:
                results = await self._search_bing(query, max_results)
            elif engine == "searchapi" and settings.searchapi_key:
                results = await self._search_searchapi(query, max_results)
        except Exception:
            if engine == "bing":
                try:
                    results = await self._search_searchapi(query, max_results)
                except Exception:
                    pass
            else:
                try:
                    results = await self._search_bing(query, max_results)
                except Exception:
                    pass

        return {"query": query, "results": results, "total_results": len(results)}

    async def auto_search(self, query: str, session_id: str | None = None) -> dict:
        triggered = should_trigger_search(query)
        if not triggered:
            return {"triggered": False, "query": query, "results": []}
        search_result = await self.search(query)
        return {"triggered": True, "query": query, "results": search_result["results"]}

    async def _search_bing(self, query: str, max_results: int) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.bing.microsoft.com/v7.0/search",
                headers={"Ocp-Apim-Subscription-Key": settings.bing_api_key},
                params={"q": query, "count": max_results},
                timeout=10,
            )
            data = resp.json()
            results = []
            for item in data.get("webPages", {}).get("value", []):
                results.append({
                    "title": item.get("name", ""),
                    "url": item.get("url", ""),
                    "summary": item.get("snippet", ""),
                    "published_at": item.get("datePublished", ""),
                })
            return results

    async def _search_searchapi(self, query: str, max_results: int) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.searchapi.io/api/v1/search",
                params={"api_key": settings.searchapi_key, "q": query, "num": max_results},
                timeout=10,
            )
            data = resp.json()
            results = []
            for item in data.get("organic_results", []):
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "summary": item.get("snippet", ""),
                    "published_at": item.get("date", ""),
                })
            return results


def should_trigger_search(message: str) -> bool:
    for trigger in SEARCH_TRIGGERS:
        if trigger in message:
            return True
    return False
