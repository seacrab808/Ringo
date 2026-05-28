from __future__ import annotations

from pathlib import Path
from typing import Protocol

from app.config import Settings
from app.repositories.task_pages_local import TaskPageLocalStore
from app.repositories.task_pages_supabase import TaskPageSupabaseStore


class TaskPageStore(Protocol):
    def load(self, task_id: str): ...
    def update_memo(self, task_id: str, memo: str): ...
    def add_attachment(self, task_id: str, *, filename: str, data: bytes, mime_type: str, kind: str = "lecture"): ...
    def all_chunks(self, page): ...
    def add_study_guide(self, task_id: str, *, body_markdown: str, model: str, source_attachment_ids: list[str]): ...


def get_task_page_store(settings: Settings | None = None):
    settings = settings or Settings()
    if settings.supabase_enabled:
        try:
            return TaskPageSupabaseStore()
        except Exception:
            pass
    backend_root = Path(__file__).resolve().parents[2]
    raw = Path(settings.task_page_storage_dir)
    root = raw if raw.is_absolute() else backend_root / raw
    return TaskPageLocalStore(root)
