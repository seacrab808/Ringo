from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.recurrence import TaskRecurrence


class TaskBase(BaseModel):
    summary: str = Field(min_length=1, max_length=500)
    timetable_label: str = Field(min_length=1, max_length=120)
    is_time_fixed: bool = False
    planned_date: date | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    deadline_at: datetime | None = None
    category: str = "other"
    category_color: str = "#D6D3D1"
    created_order: int = 0
    list_order: int = 0
    completed: bool = False
    recurrence: TaskRecurrence | None = None


class TaskCreate(TaskBase):
    id: UUID | None = None


class TaskUpdate(BaseModel):
    summary: str | None = None
    timetable_label: str | None = None
    is_time_fixed: bool | None = None
    planned_date: date | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    deadline_at: datetime | None = None
    category: str | None = None
    category_color: str | None = None
    created_order: int | None = None
    list_order: int | None = None
    completed: bool | None = None
    recurrence: TaskRecurrence | None = None


class TaskOut(TaskBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskReorderBody(BaseModel):
    planned_date: date
    task_ids: list[str] = Field(min_length=1)


class RecurrenceCancelBody(BaseModel):
    date: date


class DiaryOut(BaseModel):
    id: UUID
    diary_date: date
    body: str
    created_at: datetime
    updated_at: datetime


class DiaryUpsert(BaseModel):
    body: str = ""


class TimetableBlockOut(BaseModel):
    task_id: UUID
    summary: str
    timetable_label: str
    category: str
    category_color: str
    start_slot: int = Field(ge=0, le=143)
    span: int = Field(ge=1, le=144)
    start_at: datetime
    end_at: datetime


class TimetableDayOut(BaseModel):
    date: date
    day_start_hour: int
    slot_count: int
    blocks: list[TimetableBlockOut]
