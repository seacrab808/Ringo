from __future__ import annotations

import base64
from datetime import datetime
from uuid import UUID

from urllib.parse import quote

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.config import get_settings
from app.schemas.task_page import (
    AttachmentOut,
    StudyGuideFromChatRequest,
    StudyGuideGenerateRequest,
    StudyGuideGenerateResponse,
    StudyGuideReviseRequest,
    StudyGuideReviseResponse,
    StudyGuideOut,
    StudyGuidePdfExportRequest,
    TaskPageMemoUpdate,
    TaskPageOut,
)
from app.repositories.chat_store_factory import get_chat_attachment_store
from app.services.chat_task_page_import import import_chat_to_task_page
from app.services.embedding_service import EmbeddingService
from app.services.document_extract import is_allowed_upload
from app.services.pdf_export import markdown_to_pdf_bytes
from app.services.study_guide_generator import StudyGuideGenerator
from app.services.task_page_store import get_task_page_store

router = APIRouter(prefix="/tasks", tags=["task-pages"])


def _page_to_out(page) -> TaskPageOut:
    attachments = [
        AttachmentOut(
            id=UUID(a.id),
            task_id=UUID(a.task_id),
            filename=a.filename,
            mime_type=a.mime_type,
            kind=a.kind,
            byte_size=a.byte_size,
            has_text=bool(a.extracted_text),
            created_at=datetime.fromisoformat(a.created_at.replace("Z", "+00:00"))
            if a.created_at
            else datetime.now(),
        )
        for a in page.attachments
    ]
    latest = None
    if page.study_guides:
        g = page.study_guides[0]
        latest = StudyGuideOut(
            id=UUID(g.id),
            task_id=UUID(g.task_id),
            body_markdown=g.body_markdown,
            model=g.model,
            source_attachment_ids=[UUID(x) for x in g.source_attachment_ids],
            created_at=datetime.fromisoformat(g.created_at.replace("Z", "+00:00")),
        )
    return TaskPageOut(
        task_id=UUID(page.task_id),
        memo=page.memo,
        attachments=attachments,
        latest_study_guide=latest,
    )


@router.get("/{task_id}/page", response_model=TaskPageOut)
def get_task_page(task_id: UUID) -> TaskPageOut:
    page = get_task_page_store().load(str(task_id))
    return _page_to_out(page)


@router.patch("/{task_id}/page", response_model=TaskPageOut)
def update_task_memo(task_id: UUID, body: TaskPageMemoUpdate) -> TaskPageOut:
    page = get_task_page_store().update_memo(str(task_id), body.memo)
    return _page_to_out(page)


@router.post("/{task_id}/attachments", response_model=TaskPageOut)
async def upload_attachment(
    task_id: UUID,
    file: UploadFile = File(...),
    kind: str = "lecture",
) -> TaskPageOut:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")

    mime = file.content_type or "application/octet-stream"
    filename = file.filename or "upload.bin"
    if not is_allowed_upload(filename, mime):
        raise HTTPException(
            status_code=400,
            detail="PDF 또는 PPT(.pptx)만 업로드할 수 있습니다.",
        )
    page = get_task_page_store().add_attachment(
        str(task_id),
        filename=filename,
        data=data,
        mime_type=mime,
        kind=kind,
    )
    return _page_to_out(page)


@router.post("/{task_id}/study-guide/generate", response_model=StudyGuideGenerateResponse)
async def generate_study_guide(
    task_id: UUID,
    body: StudyGuideGenerateRequest,
) -> StudyGuideGenerateResponse:
    store = get_task_page_store()
    page = store.load(str(task_id))
    chunks = store.all_chunks(page)
    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="강의 자료(PDF/PPT)를 먼저 업로드해 주세요.",
        )

    chunk_embeddings = None
    if hasattr(store, "chunk_embeddings"):
        chunk_embeddings = store.chunk_embeddings(page)

    settings = get_settings()
    gen = StudyGuideGenerator(settings)
    title = body.lecture_topic or f"Task {task_id}"
    markdown, model = await gen.generate_for_task(
        task_title=title,
        lecture_topic=body.lecture_topic,
        extra_instructions=body.extra_instructions,
        source_chunks=chunks,
        chunk_embeddings=chunk_embeddings,
    )
    if not markdown:
        raise HTTPException(status_code=502, detail="Ollama returned empty response")

    guide = store.add_study_guide(
        str(task_id),
        body_markdown=markdown,
        model=model,
        source_attachment_ids=[a.id for a in page.attachments if a.kind == "lecture"],
    )
    out = StudyGuideOut(
        id=UUID(guide.id),
        task_id=UUID(guide.task_id),
        body_markdown=guide.body_markdown,
        model=guide.model,
        source_attachment_ids=[UUID(x) for x in guide.source_attachment_ids],
        created_at=datetime.fromisoformat(guide.created_at.replace("Z", "+00:00")),
    )
    return StudyGuideGenerateResponse(study_guide=out, chunks_used=min(8, len(chunks)))


@router.post("/{task_id}/study-guide/revise", response_model=StudyGuideReviseResponse)
async def revise_study_guide(
    task_id: UUID,
    body: StudyGuideReviseRequest,
) -> StudyGuideReviseResponse:
    store = get_task_page_store()
    page = store.load(str(task_id))
    if not page.study_guides:
        raise HTTPException(status_code=400, detail="먼저 학습지를 생성해 주세요.")

    current = page.study_guides[0].body_markdown
    settings = get_settings()
    gen = StudyGuideGenerator(settings)
    title = (body.task_title or "").strip() or f"Task {task_id}"
    revised, model = await gen.revise_study_guide(
        current_html=current,
        instruction=body.instruction,
        task_title=title,
    )
    if not revised:
        raise HTTPException(status_code=502, detail="학습지 수정에 실패했어요 (빈 응답).")

    guide = store.add_study_guide(
        str(task_id),
        body_markdown=revised,
        model=model,
        source_attachment_ids=list(page.study_guides[0].source_attachment_ids),
    )
    out = StudyGuideOut(
        id=UUID(guide.id),
        task_id=UUID(guide.task_id),
        body_markdown=guide.body_markdown,
        model=guide.model,
        source_attachment_ids=[UUID(x) for x in guide.source_attachment_ids],
        created_at=datetime.fromisoformat(guide.created_at.replace("Z", "+00:00")),
    )
    return StudyGuideReviseResponse(study_guide=out)


@router.get("/{task_id}/attachments/{attachment_id}/download")
def download_attachment(task_id: UUID, attachment_id: UUID) -> Response:
    store = get_task_page_store()
    try:
        data, filename, mime = store.read_attachment_bytes(
            str(task_id),
            str(attachment_id),
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Attachment not found") from exc
    safe_name = quote(filename)
    return Response(
        content=data,
        media_type=mime or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}",
        },
    )


@router.post("/{task_id}/page/from-chat", response_model=TaskPageOut)
def import_task_page_from_chat(
    task_id: UUID,
    body: StudyGuideFromChatRequest,
) -> TaskPageOut:
    """After chat confirm: copy attachments + save generated study guide on the task page."""
    import_chat_to_task_page(
        str(task_id),
        chat_store=get_chat_attachment_store(),
        chat_attachment_ids=body.chat_attachment_ids,
        body_markdown=body.markdown,
        model=body.model,
    )
    page = get_task_page_store().load(str(task_id))
    return _page_to_out(page)


@router.post("/{task_id}/study-guide/export-pdf")
def export_study_guide_pdf(task_id: UUID, body: StudyGuidePdfExportRequest) -> Response:
    try:
        pdf = markdown_to_pdf_bytes(body.markdown, title=body.title)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    filename = f"study-guide-{task_id}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
