from fastapi import APIRouter, Depends
import httpx

from app.config import get_settings
from app.core.deps import get_http_client
from app.services.ollama_parser import OllamaScheduleParser

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "ringo-backend",
        "timezone": settings.ringo_timezone,
    }


@router.get("/health/ollama")
async def health_ollama(
    client: httpx.AsyncClient = Depends(get_http_client),
) -> dict:
    parser = OllamaScheduleParser()
    ok = await parser.health_check(client=client)
    settings = get_settings()
    return {
        "ollama": "up" if ok else "down",
        "base_url": settings.ollama_base_url,
        "model": settings.ollama_model,
    }
