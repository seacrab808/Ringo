from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import UUID

from app.config import get_settings
from app.db.supabase import get_supabase
from app.repositories.task_pages_local import (
    AttachmentRecord,
    StudyGuideRecord,
    TaskPageRecord,
)
from app.services.embedding_service import EmbeddingService
from app.services.document_extract import extract_text_from_document, is_allowed_upload
from app.services.rag_chunk import TextChunk, chunk_text


class TaskPageSupabaseStore:
    """Task pages with Supabase Storage + pgvector when configured."""

    def __init__(self) -> None:
        self.client = get_supabase()
        self.settings = get_settings()
        self.bucket = self.settings.supabase_storage_bucket
        self._embedder = EmbeddingService(self.settings)

    def load(self, task_id: str) -> TaskPageRecord:
        page = TaskPageRecord(task_id=task_id)
        row = (
            self.client.table("ringo_task_pages")
            .select("memo")
            .eq("task_id", task_id)
            .maybe_single()
            .execute()
        )
        if row.data:
            page.memo = row.data.get("memo") or ""

        att_rows = (
            self.client.table("ringo_attachments")
            .select("*")
            .eq("task_id", task_id)
            .order("created_at")
            .execute()
        )
        for a in att_rows.data or []:
            page.attachments.append(
                AttachmentRecord(
                    id=str(a["id"]),
                    task_id=task_id,
                    filename=a["filename"],
                    mime_type=a["mime_type"],
                    storage_path=a["storage_path"],
                    kind=a.get("kind") or "lecture",
                    byte_size=int(a.get("byte_size") or 0),
                    extracted_text=a.get("extracted_text"),
                    created_at=a.get("created_at") or "",
                )
            )

        if page.attachments:
            att_ids = [a.id for a in page.attachments]
            chunk_rows = (
                self.client.table("ringo_document_chunks")
                .select("attachment_id, chunk_index, content, token_estimate, embedding")
                .in_("attachment_id", att_ids)
                .order("chunk_index")
                .execute()
            )
            page.chunks = chunk_rows.data or []
        else:
            page.chunks = []

        guide_rows = (
            self.client.table("ringo_study_guides")
            .select("*")
            .eq("task_id", task_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        for g in guide_rows.data or []:
            page.study_guides.append(
                StudyGuideRecord(
                    id=str(g["id"]),
                    task_id=task_id,
                    body_markdown=g["body_markdown"],
                    model=g.get("model") or "",
                    source_attachment_ids=[str(x) for x in (g.get("source_attachment_ids") or [])],
                    created_at=g.get("created_at") or "",
                )
            )
        return page

    def save(self, page: TaskPageRecord) -> None:
        self.client.table("ringo_task_pages").upsert(
            {"task_id": page.task_id, "memo": page.memo},
            on_conflict="task_id",
        ).execute()

    def update_memo(self, task_id: str, memo: str) -> TaskPageRecord:
        self.client.table("ringo_task_pages").upsert(
            {"task_id": task_id, "memo": memo},
            on_conflict="task_id",
        ).execute()
        return self.load(task_id)

    def _upload_bytes(self, path: str, data: bytes, content_type: str) -> None:
        self.client.storage.from_(self.bucket).upload(
            path,
            data,
            file_options={"content-type": content_type, "upsert": "true"},
        )

    async def _embed_chunks(self, chunks: list[TextChunk]) -> list[list[float] | None]:
        import httpx

        async with httpx.AsyncClient() as client:
            return await self._embedder.embed_many(
                [c.content for c in chunks],
                client=client,
            )

    def add_attachment(
        self,
        task_id: str,
        *,
        filename: str,
        data: bytes,
        mime_type: str,
        kind: str = "lecture",
    ) -> TaskPageRecord:
        att_id = str(uuid.uuid4())
        storage_path = f"{task_id}/{att_id}_{filename.replace('/', '_')}"
        self._upload_bytes(storage_path, data, mime_type)

        extracted = ""
        if is_allowed_upload(filename, mime_type):
            suffix = Path(filename).suffix.lower() or ".bin"
            with NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
                tmp.write(data)
                tmp.flush()
                try:
                    extracted = extract_text_from_document(Path(tmp.name))
                except Exception:
                    extracted = ""

        self.client.table("ringo_attachments").insert(
            {
                "id": att_id,
                "task_id": task_id,
                "filename": filename,
                "mime_type": mime_type,
                "storage_path": storage_path,
                "kind": kind,
                "byte_size": len(data),
                "extracted_text": extracted or None,
            }
        ).execute()

        import asyncio

        s = self.settings
        for ch in chunk_text(
            extracted or "",
            chunk_size=s.study_guide_chunk_size,
            overlap=s.study_guide_chunk_overlap,
        ):
            emb = None
            if self.settings.rag_use_embeddings and extracted:
                vecs = asyncio.run(self._embed_chunks([ch]))
                emb = vecs[0]
            row = {
                "id": str(uuid.uuid4()),
                "attachment_id": att_id,
                "chunk_index": ch.index,
                "content": ch.content,
                "token_estimate": ch.token_estimate,
            }
            if emb:
                row["embedding"] = emb
            self.client.table("ringo_document_chunks").insert(row).execute()

        return self.load(task_id)

    def read_attachment_bytes(self, task_id: str, attachment_id: str) -> tuple[bytes, str, str]:
        page = self.load(task_id)
        for att in page.attachments:
            if att.id == attachment_id:
                data = self.client.storage.from_(self.bucket).download(att.storage_path)
                return data, att.filename, att.mime_type
        raise FileNotFoundError(attachment_id)

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

    def chunk_embeddings(self, page: TaskPageRecord) -> list[list[float] | None]:
        out: list[list[float] | None] = []
        for raw in page.chunks:
            emb = raw.get("embedding")
            if isinstance(emb, list):
                out.append([float(x) for x in emb])
            else:
                out.append(None)
        return out

    def match_chunks_vector(self, task_id: str, query_embedding: list[float], k: int = 8) -> list[TextChunk]:
        res = self.client.rpc(
            "match_document_chunks",
            {
                "query_embedding": query_embedding,
                "filter_task_id": task_id,
                "match_count": k,
            },
        ).execute()
        out: list[TextChunk] = []
        for i, row in enumerate(res.data or []):
            out.append(TextChunk(index=i, content=row["content"], token_estimate=0))
        return out

    def add_study_guide(
        self,
        task_id: str,
        *,
        body_markdown: str,
        model: str,
        source_attachment_ids: list[str],
    ) -> StudyGuideRecord:
        gid = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        self.client.table("ringo_study_guides").insert(
            {
                "id": gid,
                "task_id": task_id,
                "body_markdown": body_markdown,
                "model": model,
                "source_attachment_ids": source_attachment_ids,
            }
        ).execute()
        return StudyGuideRecord(
            id=gid,
            task_id=task_id,
            body_markdown=body_markdown,
            model=model,
            source_attachment_ids=source_attachment_ids,
            created_at=now,
        )
