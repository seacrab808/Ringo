from collections.abc import AsyncGenerator

import httpx
from fastapi import Header, HTTPException, status

from app.config import get_settings
from app.db.supabase import SupabaseNotConfiguredError, supabase_health_ok


def require_database() -> None:
    settings = get_settings()
    if not settings.supabase_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured on this server",
        )
    if not supabase_health_ok():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot reach Supabase",
        )


async def get_http_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    settings = get_settings()
    timeout = httpx.Timeout(settings.ollama_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        yield client


def verify_api_token(
    x_ringo_token: str | None = Header(default=None, alias="X-Ringo-Token"),
) -> None:
    """Optional single-user token gate."""
    settings = get_settings()
    expected = settings.ringo_api_token
    if not expected:
        return
    if x_ringo_token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Ringo-Token",
        )
