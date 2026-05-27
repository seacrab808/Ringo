from collections.abc import AsyncGenerator

import httpx
from fastapi import Header, HTTPException, status

from app.config import Settings, get_settings


async def get_http_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    settings = get_settings()
    timeout = httpx.Timeout(settings.ollama_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        yield client


def verify_api_token(
    x_ringo_token: str | None = Header(default=None, alias="X-Ringo-Token"),
    settings: Settings | None = None,
) -> None:
    """Optional single-user token gate."""
    settings = settings or get_settings()
    expected = settings.ringo_api_token
    if not expected:
        return
    if x_ringo_token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Ringo-Token",
        )
