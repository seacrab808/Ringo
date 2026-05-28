from __future__ import annotations

from pathlib import Path

from app.repositories.chat_attachments import ChatAttachmentStore
from app.services.task_page_store import get_task_page_store


def import_chat_to_task_page(
    task_id: str,
    *,
    chat_store: ChatAttachmentStore,
    chat_attachment_ids: list[str],
    body_markdown: str,
    model: str,
) -> list[str]:
    """Copy chat attachments into task page and save study guide. Returns new attachment ids."""
    store = get_task_page_store()
    page = store.load(task_id)
    source_ids: list[str] = []

    for cid in chat_attachment_ids:
        rec = chat_store.get(cid)
        if not rec:
            continue
        path = Path(rec.storage_path)
        if not path.is_file():
            continue
        data = path.read_bytes()
        page = store.add_attachment(
            task_id,
            filename=rec.filename,
            data=data,
            mime_type=rec.mime_type,
            kind="lecture",
        )
        if page.attachments:
            source_ids.append(page.attachments[-1].id)

    if body_markdown.strip():
        store.add_study_guide(
            task_id,
            body_markdown=body_markdown,
            model=model,
            source_attachment_ids=source_ids,
        )

    return source_ids
