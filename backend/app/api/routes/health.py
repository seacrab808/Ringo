from fastapi import APIRouter, Depends
import httpx

from app.config import get_settings
from app.core.deps import get_http_client
from app.db.supabase import supabase_health_ok
from app.services.ollama_parser import OllamaScheduleParser

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    database = "disabled"
    if settings.supabase_enabled:
        database = "connected" if supabase_health_ok() else "unreachable"
    return {
        "status": "ok",
        "service": "ringo-backend",
        "timezone": settings.ringo_timezone,
        "database": database,
        "timetable": {
            "day_start_hour": settings.timetable_day_start_hour,
            "slot_count": 24,
        },
    }


@router.get("/health/ollama")
async def health_ollama(
    client: httpx.AsyncClient = Depends(get_http_client),
) -> dict:
    parser = OllamaScheduleParser()
    settings = get_settings()
    ok = await parser.health_check(client=client)
    installed: list[str] = []
    model_ready = False
    if ok:
        try:
            resp = await client.get(f"{settings.ollama_base_url.rstrip('/')}/api/tags")
            if resp.status_code == 200:
                installed = [m.get("name", "") for m in resp.json().get("models", [])]
                model_ready = settings.ollama_model in installed
        except httpx.HTTPError:
            pass
    return {
        "ollama": "up" if ok else "down",
        "base_url": settings.ollama_base_url,
        "model": settings.ollama_model,
        "model_ready": model_ready,
        "installed_models": installed,
    }
