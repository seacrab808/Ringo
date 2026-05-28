from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.services.document_extract import extract_text_from_document, is_allowed_upload
from app.services.rag_chunk import chunk_text


@dataclass
class ChatAttachmentRecord:
    id: str
    filename: str
    mime_type: str
    storage_path: str
    byte_size: int
    extracted_text: str | None
    created_at: str

    def to_dict(self) -> dict:
        return asdict(self)


class ChatAttachmentStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self._index_path = self.root / "index.json"

    def _load_index(self) -> dict[str, dict]:
        if not self._index_path.is_file():
            return {}
        return json.loads(self._index_path.read_text(encoding="utf-8"))

    def _save_index(self, index: dict[str, dict]) -> None:
        self._index_path.write_text(
            json.dumps(index, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def add(
        self,
        *,
        filename: str,
        data: bytes,
        mime_type: str,
    ) -> ChatAttachmentRecord:
        att_id = str(uuid.uuid4())
        safe = filename.replace("/", "_").replace("\\", "_")
        dest = self.root / f"{att_id}_{safe}"
        dest.write_bytes(data)

        extracted = ""
        if is_allowed_upload(safe, mime_type):
            try:
                extracted = extract_text_from_document(dest)
            except Exception:
                extracted = ""

        rec = ChatAttachmentRecord(
            id=att_id,
            filename=filename,
            mime_type=mime_type,
            storage_path=str(dest),
            byte_size=len(data),
            extracted_text=extracted or None,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        index = self._load_index()
        index[att_id] = rec.to_dict()
        self._save_index(index)
        return rec

    def get(self, att_id: str) -> ChatAttachmentRecord | None:
        index = self._load_index()
        raw = index.get(att_id)
        if not raw:
            return None
        return ChatAttachmentRecord(**raw)

    def get_many(self, att_ids: list[str]) -> list[ChatAttachmentRecord]:
        return [r for aid in att_ids if (r := self.get(aid))]

    def combined_text(self, att_ids: list[str], *, max_chars: int = 12000) -> str:
        parts: list[str] = []
        total = 0
        for rec in self.get_many(att_ids):
            if not rec.extracted_text:
                continue
            header = f"### {rec.filename}\n"
            body = rec.extracted_text
            piece = header + body
            if total + len(piece) > max_chars:
                piece = piece[: max_chars - total]
            parts.append(piece)
            total += len(piece)
            if total >= max_chars:
                break
        return "\n\n".join(parts)

    def chunks_for_ids(self, att_ids: list[str]) -> list:
        from app.services.rag_chunk import TextChunk

        out: list[TextChunk] = []
        idx = 0
        for rec in self.get_many(att_ids):
            if not rec.extracted_text:
                continue
            from app.config import get_settings

            s = get_settings()
            for ch in chunk_text(
                rec.extracted_text,
                chunk_size=s.study_guide_chunk_size,
                overlap=s.study_guide_chunk_overlap,
            ):
                out.append(
                    TextChunk(index=idx, content=ch.content, token_estimate=ch.token_estimate)
                )
                idx += 1
        return out
