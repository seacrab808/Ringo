from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.schedule import NaturalLanguageParseResponse


class ChatAttachmentOut(BaseModel):
    id: str
    filename: str
    mime_type: str
    byte_size: int
    has_text: bool
    preview: str = ""


class ChatSendRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    attachment_ids: list[str] = Field(default_factory=list)
    reference_date: date | None = None
    timezone: str = "Asia/Seoul"
    mode: Literal["auto", "schedule", "study_guide"] = "auto"


class ChatSendResponse(BaseModel):
    kind: Literal["schedule", "study_guide"]
    parse: NaturalLanguageParseResponse | None = None
    parse_error: str | None = None
    study_guide_markdown: str | None = None
    study_guide_pdf_base64: str | None = None
    study_guide_model: str | None = None
    few_shot_used: list[str] = Field(default_factory=list)


class StudyGuidePdfRequest(BaseModel):
    markdown: str = Field(..., min_length=1)
    title: str = "Ringo 학습지"
