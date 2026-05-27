from datetime import date, datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from app.config import get_settings
from app.schemas.planner import TimetableBlockOut, TimetableDayOut


def _parse_row_times(row: dict) -> tuple[datetime | None, datetime | None]:
    start_raw = row.get("start_at")
    end_raw = row.get("end_at")
    if not start_raw:
        return None, None
    start = datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
    end = (
        datetime.fromisoformat(end_raw.replace("Z", "+00:00"))
        if end_raw
        else start + timedelta(hours=1)
    )
    return start, end


def build_timetable_for_day(rows: list[dict], day: date) -> TimetableDayOut:
    settings = get_settings()
    tz = ZoneInfo(settings.ringo_timezone)
    start_hour = settings.timetable_day_start_hour
    slot_count = 24

    day_local = datetime(day.year, day.month, day.day, tzinfo=tz)
    axis_start = day_local.replace(hour=start_hour, minute=0, second=0, microsecond=0)
    axis_end = axis_start + timedelta(hours=slot_count)

    blocks: list[TimetableBlockOut] = []
    for row in rows:
        if not row.get("is_time_fixed"):
            continue
        start, end = _parse_row_times(row)
        if not start or not end:
            continue

        start_utc = start.astimezone(timezone.utc)
        end_utc = end.astimezone(timezone.utc)
        axis_start_utc = axis_start.astimezone(timezone.utc)
        axis_end_utc = axis_end.astimezone(timezone.utc)

        if end_utc <= axis_start_utc or start_utc >= axis_end_utc:
            continue

        clamped_start = max(start_utc, axis_start_utc)
        clamped_end = min(end_utc, axis_end_utc)

        start_minutes = (clamped_start - axis_start_utc).total_seconds() / 60
        end_minutes = (clamped_end - axis_start_utc).total_seconds() / 60

        start_slot = int(start_minutes // 60)
        end_slot = int((end_minutes + 59) // 60)
        span = max(1, end_slot - start_slot)
        start_slot = max(0, min(23, start_slot))

        blocks.append(
            TimetableBlockOut(
                task_id=UUID(str(row["id"])),
                summary=row["summary"],
                timetable_label=row["timetable_label"],
                category=row["category"],
                category_color=row["category_color"],
                start_slot=start_slot,
                span=span,
                start_at=start,
                end_at=end,
            )
        )

    blocks.sort(key=lambda b: b.start_slot)
    return TimetableDayOut(
        date=day,
        day_start_hour=start_hour,
        slot_count=slot_count,
        blocks=blocks,
    )
