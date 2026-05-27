import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import diaries, health, parse, tasks, timetable
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(
        "Ringo backend starting | ollama=%s model=%s",
        settings.ollama_base_url,
        settings.ollama_model,
    )
    yield
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
    app.include_router(tasks.router, prefix=settings.ringo_api_prefix)
    app.include_router(diaries.router, prefix=settings.ringo_api_prefix)
    app.include_router(timetable.router, prefix=settings.ringo_api_prefix)

    return app


app = create_app()
