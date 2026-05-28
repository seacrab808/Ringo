from __future__ import annotations

import base64
import re
from datetime import date
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import get_settings
from app.core.deps import verify_api_token
from app.core.exceptions import OllamaConnectionError, OllamaParseError
from app.repositories.chat_store_factory import get_chat_attachment_store
from app.schemas.chat import (
    ChatAttachmentOut,
    ChatSendRequest,
    ChatSendResponse,
    StudyGuidePdfRequest,
)
from app.schemas.schedule import NaturalLanguageParseRequest
from app.services.ollama_parser import OllamaScheduleParser
from app.services.document_extract import is_allowed_upload
from app.services.pdf_export import markdown_to_pdf_bytes
from app.services.study_guide_generator import StudyGuideGenerator
from app.services.korean_text import repair_summary
from app.services.study_guide_text import derive_study_titles

router = APIRouter(prefix="/chat", tags=["chat"])

_STUDY_GUIDE_HINTS = re.compile(
    r"학습지|요약해|정리해|핵심.?정리|복습.?자료|study\s*guide",
    re.IGNORECASE,
)


def _detect_mode(text: str, mode: str) -> str:
    if mode in ("schedule", "study_guide"):
        return mode
    if _STUDY_GUIDE_HINTS.search(text):
        return "study_guide"
    return "schedule"


@router.post("/attachments", response_model=ChatAttachmentOut)
async def upload_chat_attachment(
    file: UploadFile = File(...),
    _: None = Depends(verify_api_token),
) -> ChatAttachmentOut:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")

    mime = file.content_type or "application/octet-stream"
    filename = file.filename or "upload.bin"
    if not is_allowed_upload(filename, mime):
        raise HTTPException(status_code=400, detail="PDF 또는 PPT(.pptx)만 업로드할 수 있습니다.")

    rec = get_chat_attachment_store().add(
        filename=filename,
        data=data,
        mime_type=mime,
    )
    preview = (rec.extracted_text or "")[:280]
    return ChatAttachmentOut(
        id=rec.id,
        filename=rec.filename,
        mime_type=rec.mime_type,
        byte_size=rec.byte_size,
        has_text=bool(rec.extracted_text),
        preview=preview,
    )


@router.post("/send", response_model=ChatSendResponse)
async def chat_send(
    body: ChatSendRequest,
    _: None = Depends(verify_api_token),
) -> ChatSendResponse:
    store = get_chat_attachment_store()
    mode = _detect_mode(body.text, body.mode)
    attachment_context = store.combined_text(body.attachment_ids)

    parser = OllamaScheduleParser()
    ref = body.reference_date or date.today()
    parse_req = NaturalLanguageParseRequest(
        text=body.text,
        reference_date=ref,
        timezone=body.timezone,
        attachment_context=attachment_context or None,
    )
    # Schedule title must come from the user's words, not PDF extraction noise.
    schedule_parse_req = NaturalLanguageParseRequest(
        text=body.text,
        reference_date=ref,
        timezone=body.timezone,
        attachment_context=None,
    )

    if mode == "study_guide":
        chunks = store.chunks_for_ids(body.attachment_ids)
        if not chunks and not attachment_context:
            raise HTTPException(
                status_code=400,
                detail="학습지 생성을 위해 PDF 또는 PPT를 첨부해 주세요.",
            )
        if not chunks and attachment_context:
            from app.config import get_settings
            from app.services.rag_chunk import chunk_text

            s = get_settings()
            chunks = chunk_text(
                attachment_context,
                chunk_size=s.study_guide_chunk_size,
                overlap=s.study_guide_chunk_overlap,
            )

        settings = get_settings()
        gen = StudyGuideGenerator(settings)
        catalog = gen.few_shot_dir
        from app.services.few_shot_selector import load_few_shot_catalog, select_few_shots

        picked = select_few_shots(
            body.text,
            load_few_shot_catalog(catalog),
            max_examples=2,
        )
        few_shot_used = [p.week for p in picked]

        parsed = None
        parse_error: str | None = None
        try:
            parsed = await parser.parse(schedule_parse_req)
        except (OllamaConnectionError, OllamaParseError) as exc:
            parse_error = str(exc)

        att_fallback = ""
        if body.attachment_ids:
            first = store.get(body.attachment_ids[0])
            if first:
                att_fallback = Path(first.filename).stem

        parsed_summary = None
        if parsed and parsed.events:
            repaired_events = []
            for ev in parsed.events:
                fixed = repair_summary(ev.summary, body.text, fallback=att_fallback)
                repaired_events.append(ev.model_copy(update={"summary": fixed}))
            parsed = parsed.model_copy(update={"events": repaired_events})
            parsed_summary = parsed.events[0].summary

        task_title, lecture_topic = derive_study_titles(
            body.text,
            parsed_summary=parsed_summary,
        )

        markdown, model_name = await gen.generate_for_task(
            task_title=task_title,
            lecture_topic=lecture_topic,
            extra_instructions=None,
            source_chunks=chunks,
        )
        if not markdown:
            raise HTTPException(status_code=502, detail="학습지 생성에 실패했어요 (빈 응답).")

        pdf_b64 = None
        try:
            pdf_bytes = markdown_to_pdf_bytes(markdown, title=task_title[:60])
            pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
        except Exception:
            pdf_b64 = None

        return ChatSendResponse(
            kind="study_guide",
            parse=parsed,
            parse_error=parse_error,
            study_guide_markdown=markdown,
            study_guide_pdf_base64=pdf_b64,
            study_guide_model=model_name,
            few_shot_used=few_shot_used,
        )

    try:
        parsed = await parser.parse(parse_req)
    except OllamaConnectionError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OllamaParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ChatSendResponse(kind="schedule", parse=parsed)


@router.post("/study-guide/pdf")
def export_study_guide_pdf(
    body: StudyGuidePdfRequest,
    _: None = Depends(verify_api_token),
) -> dict:
    try:
        pdf = markdown_to_pdf_bytes(body.markdown, title=body.title)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "filename": f"{body.title[:40]}.pdf",
        "pdf_base64": base64.b64encode(pdf).decode("ascii"),
    }
