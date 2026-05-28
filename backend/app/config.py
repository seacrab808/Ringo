from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ollama_base_url: str = Field(
        default="http://127.0.0.1:11434",
        validation_alias="OLLAMA_BASE_URL",
    )
    ollama_model: str = Field(
        default="llama3.2:latest",
        validation_alias="OLLAMA_MODEL",
    )
    ollama_study_guide_model: str = Field(
        default="",
        validation_alias="OLLAMA_STUDY_GUIDE_MODEL",
        description="Korean-friendly model for study guides; empty = OLLAMA_MODEL",
    )
    ollama_timeout_seconds: float = Field(
        default=90.0,
        validation_alias="OLLAMA_TIMEOUT_SECONDS",
    )
    ollama_connect_timeout_seconds: float = Field(
        default=5.0,
        validation_alias="OLLAMA_CONNECT_TIMEOUT_SECONDS",
    )
    ollama_num_predict: int = Field(
        default=384,
        validation_alias="OLLAMA_NUM_PREDICT",
        description="Max tokens to generate; schedule JSON needs far less than 1024",
    )
    ollama_keep_alive: str = Field(
        default="15m",
        validation_alias="OLLAMA_KEEP_ALIVE",
        description="Keep model loaded in Ollama between requests",
    )
    ollama_warmup_on_start: bool = Field(
        default=True,
        validation_alias="OLLAMA_WARMUP_ON_START",
    )

    ringo_api_prefix: str = Field(
        default="/api/v1",
        validation_alias="RINGO_API_PREFIX",
    )
    ringo_cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias="RINGO_CORS_ORIGINS",
    )
    ringo_api_token: str = Field(default="", validation_alias="RINGO_API_TOKEN")
    ringo_timezone: str = Field(default="Asia/Seoul", validation_alias="RINGO_TIMEZONE")

    # Motemote timetable: 06:00 today → 05:00 next day
    timetable_day_start_hour: int = Field(default=6, validation_alias="TIMETABLE_DAY_START_HOUR")
    timetable_next_day_end_hour: int = Field(
        default=5,
        validation_alias="TIMETABLE_NEXT_DAY_END_HOUR",
    )
    default_event_duration_minutes: int = Field(
        default=60,
        validation_alias="DEFAULT_EVENT_DURATION_MINUTES",
    )

    supabase_url: str = Field(default="", validation_alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(
        default="",
        validation_alias="SUPABASE_SERVICE_ROLE_KEY",
    )

    task_page_storage_dir: str = Field(
        default="storage/task_pages",
        validation_alias="TASK_PAGE_STORAGE_DIR",
    )
    study_guide_few_shot_dir: str = Field(
        default="data/study_guide_examples",
        validation_alias="STUDY_GUIDE_FEW_SHOT_DIR",
    )
    study_guide_num_predict: int = Field(
        default=32768,
        validation_alias="STUDY_GUIDE_NUM_PREDICT",
    )
    study_guide_rag_top_k: int = Field(
        default=28,
        validation_alias="STUDY_GUIDE_RAG_TOP_K",
    )
    study_guide_min_sections: int = Field(
        default=8,
        validation_alias="STUDY_GUIDE_MIN_SECTIONS",
    )
    study_guide_few_shot_count: int = Field(
        default=3,
        validation_alias="STUDY_GUIDE_FEW_SHOT_COUNT",
    )
    study_guide_few_shot_max_chars: int = Field(
        default=12000,
        validation_alias="STUDY_GUIDE_FEW_SHOT_MAX_CHARS",
    )
    study_guide_chunk_size: int = Field(
        default=1200,
        validation_alias="STUDY_GUIDE_CHUNK_SIZE",
    )
    study_guide_chunk_overlap: int = Field(
        default=180,
        validation_alias="STUDY_GUIDE_CHUNK_OVERLAP",
    )
    study_guide_student_profile: str = Field(
        default="서강대학교 대학원에서 전공 수업을 듣는 석사과정 학생입니다.",
        validation_alias="STUDY_GUIDE_STUDENT_PROFILE",
    )
    study_guide_course_name: str = Field(
        default="",
        validation_alias="STUDY_GUIDE_COURSE_NAME",
        description="Empty = use task title from schedule/chat",
    )
    study_guide_timeout_seconds: float = Field(
        default=360.0,
        validation_alias="STUDY_GUIDE_TIMEOUT_SECONDS",
    )
    study_guide_temperature: float = Field(
        default=0.25,
        validation_alias="STUDY_GUIDE_TEMPERATURE",
    )
    ollama_embed_model: str = Field(
        default="nomic-embed-text",
        validation_alias="OLLAMA_EMBED_MODEL",
    )
    rag_use_embeddings: bool = Field(
        default=True,
        validation_alias="RAG_USE_EMBEDDINGS",
    )
    chat_attachment_storage_dir: str = Field(
        default="storage/chat_attachments",
        validation_alias="CHAT_ATTACHMENT_STORAGE_DIR",
    )
    supabase_storage_bucket: str = Field(
        default="ringo-attachments",
        validation_alias="SUPABASE_STORAGE_BUCKET",
    )

    @property
    def study_guide_model(self) -> str:
        m = self.ollama_study_guide_model.strip()
        return m or self.ollama_model

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url.strip() and self.supabase_service_role_key.strip())

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.ringo_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
