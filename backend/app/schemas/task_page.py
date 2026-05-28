from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AttachmentOut(BaseModel):
    id: UUID
    task_id: UUID
    filename: str
    mime_type: str
    kind: str
    byte_size: int
    has_text: bool
    created_at: datetime


class StudyGuideOut(BaseModel):
    id: UUID
    task_id: UUID
    body_markdown: str
    model: str
    source_attachment_ids: list[UUID]
    created_at: datetime


class TaskPageOut(BaseModel):
    task_id: UUID
    memo: str = ""
    attachments: list[AttachmentOut] = Field(default_factory=list)
    latest_study_guide: StudyGuideOut | None = None


class TaskPageMemoUpdate(BaseModel):
    memo: str = ""


class StudyGuideGenerateRequest(BaseModel):
    lecture_topic: str | None = None
    extra_instructions: str | None = None


class StudyGuideGenerateResponse(BaseModel):
    study_guide: StudyGuideOut
    chunks_used: int


class StudyGuideReviseRequest(BaseModel):
    instruction: str = Field(..., min_length=1, max_length=4000)
    task_title: str | None = None


class StudyGuideReviseResponse(BaseModel):
    study_guide: StudyGuideOut


class StudyGuidePdfExportRequest(BaseModel):
    markdown: str = Field(..., min_length=1)
    title: str = "Ringo 학습지"


class StudyGuideFromChatRequest(BaseModel):
    markdown: str = Field(..., min_length=1)
    model: str = "unknown"
    chat_attachment_ids: list[str] = Field(default_factory=list)
