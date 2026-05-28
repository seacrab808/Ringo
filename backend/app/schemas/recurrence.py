from datetime import date

from pydantic import BaseModel, Field


class TaskRecurrence(BaseModel):
    frequency: str = Field(default="WEEKLY")
    by_day: list[str] = Field(
        default_factory=list,
        description="MO,TU,WE,TH,FR,SA,SU",
    )
    by_hour: int | None = Field(default=None, ge=0, le=23)
    by_minute: int | None = Field(default=None, ge=0, le=59)
    semester_start: date | None = None
    semester_end: date | None = None
    cancelled_dates: list[date] = Field(default_factory=list)
