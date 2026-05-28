from __future__ import annotations

import json
import shutil
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.services.document_extract import extract_text_from_document, is_allowed_upload
from app.services.rag_chunk import TextChunk, chunk_text


@dataclass
class AttachmentRecord:
    id: str
    task_id: str
    filename: str
    mime_type: str
    storage_path: str
    kind: str
    byte_size: int
    extracted_text: str | None = None
    created_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class StudyGuideRecord:
    id: str
    task_id: str
    body_markdown: str
    model: str
    source_attachment_ids: list[str]
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class TaskPageRecord:
    task_id: str
    memo: str = ""
    attachments: list[AttachmentRecord] = field(default_factory=list)
    chunks: list[dict[str, Any]] = field(default_factory=list)
    study_guides: list[StudyGuideRecord] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_id": self.task_id,
            "memo": self.memo,
            "attachments": [a.to_dict() for a in self.attachments],
            "chunks": self.chunks,
            "study_guides": [g.to_dict() for g in self.study_guides],
        }


class TaskPageLocalStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _page_path(self, task_id: str) -> Path:
        return self.root / f"{task_id}.json"

    def _attach_dir(self, task_id: str) -> Path:
        d = self.root / "attachments" / task_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def load(self, task_id: str) -> TaskPageRecord:
        path = self._page_path(task_id)
        if not path.is_file():
            return TaskPageRecord(task_id=task_id)
        raw = json.loads(path.read_text(encoding="utf-8"))
        page = TaskPageRecord(task_id=task_id, memo=raw.get("memo", ""))
        for a in raw.get("attachments", []):
            page.attachments.append(AttachmentRecord(**a))
        page.chunks = raw.get("chunks", [])
        for g in raw.get("study_guides", []):
            page.study_guides.append(StudyGuideRecord(**g))
        return page

    def save(self, page: TaskPageRecord) -> None:
        self._page_path(page.task_id).write_text(
            json.dumps(page.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def update_memo(self, task_id: str, memo: str) -> TaskPageRecord:
        page = self.load(task_id)
        page.memo = memo
        self.save(page)
        return page

    def add_attachment(
        self,
        task_id: str,
        *,
        filename: str,
        data: bytes,
        mime_type: str,
        kind: str = "lecture",
    ) -> TaskPageRecord:
        page = self.load(task_id)
        att_id = str(uuid.uuid4())
        safe_name = filename.replace("/", "_").replace("\\", "_")
        dest = self._attach_dir(task_id) / f"{att_id}_{safe_name}"
        dest.write_bytes(data)

        extracted = ""
        if is_allowed_upload(safe_name, mime_type):
            try:
                extracted = extract_text_from_document(dest)
            except Exception:
                extracted = ""

        att = AttachmentRecord(
            id=att_id,
            task_id=task_id,
            filename=filename,
            mime_type=mime_type,
            storage_path=str(dest),
            kind=kind,
            byte_size=len(data),
            extracted_text=extracted or None,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        page.attachments.append(att)

        if extracted:
            from app.config import get_settings

            s = get_settings()
            for ch in chunk_text(
                extracted,
                chunk_size=s.study_guide_chunk_size,
                overlap=s.study_guide_chunk_overlap,
            ):
                page.chunks.append(
                    {
                        "attachment_id": att_id,
                        "index": ch.index,
                        "content": ch.content,
                        "token_estimate": ch.token_estimate,
                    }
                )

        self.save(page)
        return page

    def all_chunks(self, page: TaskPageRecord) -> list[TextChunk]:
        out: list[TextChunk] = []
        for i, raw in enumerate(page.chunks):
            out.append(
                TextChunk(
                    index=i,
                    content=raw["content"],
                    token_estimate=raw.get("token_estimate", 0),
                )
            )
        return out

    def add_study_guide(
        self,
        task_id: str,
        *,
        body_markdown: str,
        model: str,
        source_attachment_ids: list[str],
    ) -> StudyGuideRecord:
        page = self.load(task_id)
        guide = StudyGuideRecord(
            id=str(uuid.uuid4()),
            task_id=task_id,
            body_markdown=body_markdown,
            model=model,
            source_attachment_ids=source_attachment_ids,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        page.study_guides.insert(0, guide)
        self.save(page)
        return guide

    def read_attachment_bytes(self, task_id: str, attachment_id: str) -> tuple[bytes, str, str]:
        page = self.load(task_id)
        for att in page.attachments:
            if att.id == attachment_id:
                path = Path(att.storage_path)
                if not path.is_file():
                    raise FileNotFoundError(att.storage_path)
                return path.read_bytes(), att.filename, att.mime_type
        raise FileNotFoundError(attachment_id)

    def delete_attachment(self, task_id: str, attachment_id: str) -> TaskPageRecord:
        page = self.load(task_id)
        kept: list[AttachmentRecord] = []
        for att in page.attachments:
            if att.id == attachment_id:
                try:
                    Path(att.storage_path).unlink(missing_ok=True)
                except OSError:
                    pass
            else:
                kept.append(att)
        page.attachments = kept
        page.chunks = [c for c in page.chunks if c.get("attachment_id") != attachment_id]
        self.save(page)
        return page

    def delete_task(self, task_id: str) -> None:
        path = self._page_path(task_id)
        if path.is_file():
            path.unlink()
        adir = self.root / "attachments" / task_id
        if adir.is_dir():
            shutil.rmtree(adir, ignore_errors=True)
