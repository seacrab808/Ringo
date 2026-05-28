import asyncio
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import categories, diaries, health, parse, tasks, timetable
from app.config import get_settings
from app.schemas.schedule import NaturalLanguageParseRequest
from app.services.ollama_parser import OllamaScheduleParser

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def _warmup_ollama(settings) -> None:
    """Load model once at startup so the first user chat is not stuck ~30–60s."""
    try:
        parser = OllamaScheduleParser(settings)
        req = NaturalLanguageParseRequest(text="안녕", timezone=settings.ringo_timezone)
        timeout = httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            await parser.parse(req, client=client)
        logger.info("Ollama warmup complete")
    except Exception as exc:
        logger.warning("Ollama warmup skipped (first user parse may be slow): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(
        "Ringo backend starting | ollama=%s model=%s num_predict=%d",
        settings.ollama_base_url,
        settings.ollama_model,
        settings.ollama_num_predict,
    )
    warmup_task: asyncio.Task | None = None
    if settings.ollama_warmup_on_start:
        warmup_task = asyncio.create_task(_warmup_ollama(settings))

    yield

    if warmup_task and not warmup_task.done():
        warmup_task.cancel()
    logger.info("Ringo backend shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Ringo API",
        description="1인 맞춤형 AI 비서 — 자연어 일정 파싱 백엔드",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(parse.router, prefix=settings.ringo_api_prefix)
    app.include_router(categories.router, prefix=settings.ringo_api_prefix)
    app.include_router(tasks.router, prefix=settings.ringo_api_prefix)
    app.include_router(diaries.router, prefix=settings.ringo_api_prefix)
    app.include_router(timetable.router, prefix=settings.ringo_api_prefix)

    return app


app = create_app()
