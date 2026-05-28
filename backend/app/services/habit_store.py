from __future__ import annotations

from datetime import date
from pathlib import Path
from uuid import UUID

from app.config import Settings
from app.repositories.habits_local import HabitsLocalStore


def get_habit_store(settings: Settings | None = None) -> HabitsLocalStore:
    settings = settings or Settings()
    if settings.supabase_enabled:
        try:
            from app.repositories.habits_supabase import HabitsSupabaseStore

            return HabitsSupabaseStore()  # type: ignore[return-value]
        except Exception:
            pass
    backend_root = Path(__file__).resolve().parents[2]
    raw = Path(getattr(settings, "habit_storage_dir", "storage/habits"))
    root = raw if raw.is_absolute() else backend_root / raw
    return HabitsLocalStore(root)
