"""
Ringo schedule schemas (iCal-like fields for internal storage / optional GCal sync).

See docs/PRODUCT_SPEC.md for product rules.
"""

from __future__ import annotations

from datetime import date as Date
from datetime import datetime, time, timedelta
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

# Motemote timetable & duration defaults (override via Settings in API layer)
DEFAULT_DURATION_MINUTES = 60
TIMETABLE_DAY_START_HOUR = 6
TIMETABLE_NEXT_DAY_END_HOUR = 5


class EventCategory(str, Enum):
    """Built-in category slugs (users may add unlimited custom slugs in DB)."""

    CLASS = "class"
    TA = "ta"
    RESEARCH = "research"
    HEALTH = "health"
    PERSONAL = "personal"
    OTHER = "other"


class ScheduleKind(str, Enum):
    """How this item appears on the daily planner."""

    TIMED = "timed"  # fixed start (and usually end) → timetable block
    DEADLINE = "deadline"  # due by date, no fixed clock time
    FLEXIBLE = "flexible"  # no time, no deadline


class CalendarDateTime(BaseModel):
    """
    Google Calendar `EventDateTime` subset.
    Use `date` for all-day; `date_time` + `time_zone` for timed events.
    """

    model_config = {"populate_by_name": True}

    all_day_date: Date | None = Field(
        default=None,
        alias="date",
        serialization_alias="date",
        description="All-day event date (YYYY-MM-DD).",
    )
    date_time: datetime | None = Field(
        default=None,
        description="Timed event start/end (ISO 8601).",
    )
    time_zone: str = Field(
        default="Asia/Seoul",
        description="IANA timezone, e.g. Asia/Seoul.",
    )

    @model_validator(mode="after")
    def require_date_or_datetime(self) -> CalendarDateTime:
        if self.all_day_date is None and self.date_time is None:
            raise ValueError("Either date or date_time must be set")
        return self


class RecurrenceRule(BaseModel):
    """
    Simplified recurrence (maps to RRULE in a later phase).
    Example: every Friday 14:00 during semester.
    """

    frequency: str = Field(
        default="WEEKLY",
        description="DAILY | WEEKLY | MONTHLY",
    )
    by_day: list[str] = Field(
        default_factory=list,
        description="MO,TU,WE,TH,FR,SA,SU — Google Calendar BYDAY values.",
    )
    by_hour: int | None = Field(default=None, ge=0, le=23)
    by_minute: int | None = Field(default=None, ge=0, le=59)
    count: int | None = Field(default=None, ge=1)
    until: Date | None = None
    semester_start: Date | None = Field(
        default=None,
        description="First day of term (inclusive) for class schedules.",
    )
    semester_end: Date | None = Field(
        default=None,
        description="Last day of term (inclusive).",
    )
    rrule: str | None = Field(
        default=None,
        description="Optional raw RRULE string, e.g. RRULE:FREQ=WEEKLY;BYDAY=FR",
    )


def apply_default_end(
    start: CalendarDateTime,
    end: CalendarDateTime | None = None,
    *,
    duration_minutes: int = DEFAULT_DURATION_MINUTES,
) -> CalendarDateTime | None:
    """If end is missing but start has clock time, end = start + duration (default 1h)."""
    if end is not None and end.date_time is not None:
        return end
    if start.date_time is None:
        return end
    end_dt = start.date_time + timedelta(minutes=duration_minutes)
    return CalendarDateTime(date_time=end_dt, time_zone=start.time_zone)


class ParsedScheduleEvent(BaseModel):
    """One parsed schedule item for Ringo (task + optional timetable block)."""

    # --- Core fields (iCal-compatible names) ---
    summary: str = Field(..., description="Full task title for the left column.")
    description: str | None = None
    location: str | None = None
    start: CalendarDateTime | None = Field(
        default=None,
        description="Null when time is not fixed yet.",
    )
    end: CalendarDateTime | None = None
    recurrence: list[str] | None = Field(
        default=None,
        description="List of RRULE/EXDATE strings (Google Calendar style).",
    )
    recurrence_rule: RecurrenceRule | None = Field(
        default=None,
        description="Structured recurrence for semester classes.",
    )
    color_id: str | None = Field(
        default=None,
        description="Optional Google colorId string.",
    )

    # --- Ringo extensions ---
    schedule_kind: ScheduleKind = ScheduleKind.FLEXIBLE
    is_time_fixed: bool = Field(
        default=False,
        description="True when start time (and usually date) is known.",
    )
    is_all_day: bool = False
    deadline: CalendarDateTime | None = Field(
        default=None,
        description="Due by date/time without a fixed work block, e.g. '이번주 금요일까지'.",
    )
    timetable_label: str | None = Field(
        default=None,
        description="Short label on the right timetable; defaults to summary if empty.",
    )
    category: str = Field(
        default=EventCategory.OTHER.value,
        description="Category slug — built-in or user-created (외주, 회의, …).",
    )
    category_color: str | None = Field(
        default=None,
        description="Hex color #RRGGBB; filled from DB category if omitted.",
    )
    confidence: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Parser confidence 0–1.",
    )
    raw_user_text: str | None = Field(
        default=None,
        description="Original Korean utterance snippet for this event.",
    )
    parsing_notes: str | None = Field(
        default=None,
        description="LLM notes: ambiguity, assumed year, etc.",
    )

    @field_validator("summary")
    @classmethod
    def summary_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("summary must not be empty")
        return stripped

    @property
    def start_time_hhmm(self) -> str | None:
        """Convenience: '14:00' from start, for task list UI."""
        if self.start is None:
            return None
        if self.start.date_time is not None:
            return self.start.date_time.strftime("%H:%M")
        return None

    @property
    def title(self) -> str:
        """Alias used in product docs."""
        return self.summary

    @property
    def display_timetable_label(self) -> str:
        return (self.timetable_label or self.summary).strip()

    def with_default_end(
        self,
        duration_minutes: int = DEFAULT_DURATION_MINUTES,
    ) -> ParsedScheduleEvent:
        """Return copy with end set to start + duration when end is missing."""
        if self.start is None:
            return self
        new_end = apply_default_end(self.start, self.end, duration_minutes=duration_minutes)
        if new_end is self.end:
            return self
        return self.model_copy(update={"end": new_end})


class NaturalLanguageParseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    reference_date: Date | None = Field(
        default=None,
        description="Anchor 'today' for relative phrases (default: server today in timezone).",
    )
    timezone: str = Field(default="Asia/Seoul")
    allow_multiple_events: bool = Field(
        default=True,
        description="Parse multiple events from one sentence if present.",
    )


class NaturalLanguageParseResponse(BaseModel):
    events: list[ParsedScheduleEvent] = Field(default_factory=list)
    model: str
    latency_ms: float
    reference_date: Date
    timezone: str
    unparsed_fragments: list[str] = Field(default_factory=list)


# --- Task list sorting (dashboard Tasks column) ---


class SortableTask(BaseModel):
    """
    Lightweight task row for sort endpoint / frontend mirror.
    """

    id: str
    summary: str
    is_time_fixed: bool = False
    start: CalendarDateTime | None = None
    created_order: int = Field(
        default=0,
        description="Registration order; lower = earlier among unfixed tasks.",
    )
    category: str = EventCategory.OTHER.value
    deadline: CalendarDateTime | None = None
    timetable_label: str | None = None

    @property
    def sort_key_time(self) -> time | None:
        if not self.is_time_fixed or self.start is None:
            return None
        if self.start.date_time is not None:
            return self.start.date_time.time()
        return None


class TaskListSortRequest(BaseModel):
    tasks: list[SortableTask]


class TaskListSortResponse(BaseModel):
    tasks: list[SortableTask]
    fixed_count: int
    unfixed_count: int


def _task_sort_tuple(task: SortableTask) -> tuple[int, time, int, str]:
    """
    Sort key:
    1. Fixed-time tasks first (0), unfixed later (1)
    2. By start time ascending (midnight default if missing)
    3. By created_order for unfixed
    4. Stable tie-break: id
    """
    fixed_rank = 0 if task.is_time_fixed else 1
    t = task.sort_key_time or time(23, 59, 59)
    if task.is_time_fixed:
        return (fixed_rank, t, 0, task.id)
    return (fixed_rank, time(0, 0), task.created_order, task.id)


def sort_tasks(tasks: list[SortableTask]) -> list[SortableTask]:
    """Fixed-time tasks on top (by time), unfixed below (by registration order)."""
    return sorted(tasks, key=_task_sort_tuple)


def parse_response_to_tasks(
    response: NaturalLanguageParseResponse,
    *,
    id_prefix: str = "parsed",
    start_order: int = 0,
) -> list[SortableTask]:
    """Convert parse result into sortable tasks (for immediate UI merge)."""
    tasks: list[SortableTask] = []
    for i, ev in enumerate(response.events):
        tasks.append(
            SortableTask(
                id=f"{id_prefix}-{i}",
                summary=ev.summary,
                is_time_fixed=ev.is_time_fixed,
                start=ev.start,
                created_order=start_order + i,
                category=ev.category,
                deadline=ev.deadline,
                timetable_label=ev.timetable_label,
            )
        )
    return sort_tasks(tasks)


def parsed_event_json_schema() -> dict[str, Any]:
    """JSON schema hint for Ollama `format` field (draft subset)."""
    return {
        "type": "object",
        "properties": {
            "events": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "description": {"type": ["string", "null"]},
                        "location": {"type": ["string", "null"]},
                        "schedule_kind": {
                            "type": "string",
                            "enum": [k.value for k in ScheduleKind],
                        },
                        "is_time_fixed": {"type": "boolean"},
                        "is_all_day": {"type": "boolean"},
                        "timetable_label": {"type": ["string", "null"]},
                        "category": {"type": "string"},
                        "category_color": {"type": ["string", "null"]},
                        "deadline": {
                            "type": ["object", "null"],
                            "properties": {
                                "date": {"type": ["string", "null"]},
                                "date_time": {"type": ["string", "null"]},
                                "time_zone": {"type": "string"},
                            },
                        },
                        "confidence": {"type": "number"},
                        "parsing_notes": {"type": ["string", "null"]},
                        "start": {
                            "type": ["object", "null"],
                            "properties": {
                                "date": {"type": ["string", "null"]},
                                "date_time": {"type": ["string", "null"]},
                                "time_zone": {"type": "string"},
                            },
                        },
                        "end": {
                            "type": ["object", "null"],
                            "properties": {
                                "date": {"type": ["string", "null"]},
                                "date_time": {"type": ["string", "null"]},
                                "time_zone": {"type": "string"},
                            },
                        },
                        "recurrence_rule": {
                            "type": ["object", "null"],
                            "properties": {
                                "frequency": {"type": "string"},
                                "by_day": {"type": "array", "items": {"type": "string"}},
                                "by_hour": {"type": ["integer", "null"]},
                                "by_minute": {"type": ["integer", "null"]},
                                "semester_start": {"type": ["string", "null"]},
                                "semester_end": {"type": ["string", "null"]},
                                "rrule": {"type": ["string", "null"]},
                            },
                        },
                    },
                    "required": ["summary", "is_time_fixed"],
                },
            },
            "unparsed_fragments": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["events"],
    }
