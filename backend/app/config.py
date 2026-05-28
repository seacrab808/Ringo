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

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url.strip() and self.supabase_service_role_key.strip())

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.ringo_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
