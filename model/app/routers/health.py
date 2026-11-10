import httpx
from fastapi import APIRouter, Depends
from app.config import get_settings
from app.dependencies.http_client import get_http_client


router = APIRouter(tags=["meta"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/models")
async def list_models(client: httpx.AsyncClient = Depends(get_http_client)) -> dict:
    settings = get_settings()
    url = f"{settings.lm_studio_base_url}/models"
    headers = {"Authorization": f"Bearer {settings.lm_studio_api_key}"} if settings.lm_studio_api_key else {}
    resp = await client.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()

