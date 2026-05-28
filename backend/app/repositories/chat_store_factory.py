from __future__ import annotations

from pathlib import Path

from app.config import get_settings
from app.repositories.chat_attachments import ChatAttachmentStore


def get_chat_attachment_store() -> ChatAttachmentStore:
    settings = get_settings()
    backend_root = Path(__file__).resolve().parents[2]
    raw = Path(settings.chat_attachment_storage_dir)
    root = raw if raw.is_absolute() else backend_root / raw
    return ChatAttachmentStore(root)
