"""Expand weekly semester recurrence into per-day task instances."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from app.schemas.recurrence import TaskRecurrence

_BYDAY_IDX = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}


def parse_recurrence(raw: dict[str, Any] | None) -> TaskRecurrence | None:
    if not raw or not isinstance(raw, dict):
        return None
    try:
        return TaskRecurrence.model_validate(raw)
    except Exception:
        return None


def _weekday_matches(day: date, by_day: list[str]) -> bool:
    if not by_day:
        return False
    wd = day.weekday()
    return any(_BYDAY_IDX.get(d.upper(), -1) == wd for d in by_day)


def occurs_on_date(rule: TaskRecurrence, day: date) -> bool:
    if rule.semester_start and day < rule.semester_start:
        return False
    if rule.semester_end and day > rule.semester_end:
        return False
    if day.isoformat() in {d.isoformat() if isinstance(d, date) else str(d) for d in rule.cancelled_dates}:
        return False
    return _weekday_matches(day, rule.by_day)


def instance_times(
    day: date,
    rule: TaskRecurrence,
    *,
    tz: str = "Asia/Seoul",
    duration_minutes: int = 60,
) -> tuple[datetime, datetime] | None:
    if rule.by_hour is None:
        return None
    zone = ZoneInfo(tz)
    start = datetime(
        day.year,
        day.month,
        day.day,
        rule.by_hour,
        rule.by_minute or 0,
        tzinfo=zone,
    )
    end = start + timedelta(minutes=duration_minutes)
    return start, end


def iter_occurrence_dates(rule: TaskRecurrence, date_from: date, date_to: date) -> list[date]:
    if date_to < date_from:
        return []
    start = date_from
    if rule.semester_start and rule.semester_start > start:
        start = rule.semester_start
    end = date_to
    if rule.semester_end and rule.semester_end < end:
        end = rule.semester_end

    out: list[date] = []
    cur = start
    while cur <= end:
        if occurs_on_date(rule, cur):
            out.append(cur)
        cur += timedelta(days=1)
    return out
