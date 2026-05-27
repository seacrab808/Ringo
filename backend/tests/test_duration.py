from datetime import datetime
from zoneinfo import ZoneInfo

from app.schemas.schedule import CalendarDateTime, ParsedScheduleEvent, apply_default_end


def test_apply_default_end_one_hour():
    start = CalendarDateTime(
        date_time=datetime(2026, 5, 30, 14, 0, tzinfo=ZoneInfo("Asia/Seoul")),
        time_zone="Asia/Seoul",
    )
    end = apply_default_end(start, None, duration_minutes=60)
    assert end is not None
    assert end.date_time is not None
    assert end.date_time.hour == 15
    assert end.date_time.minute == 0


def test_parsed_event_with_default_end():
    ev = ParsedScheduleEvent(
        summary="딥러닝 수업",
        is_time_fixed=True,
        start=CalendarDateTime(
            date_time=datetime(2026, 5, 30, 14, 0, tzinfo=ZoneInfo("Asia/Seoul")),
            time_zone="Asia/Seoul",
        ),
    )
    filled = ev.with_default_end()
    assert filled.end is not None
    assert filled.end.date_time.hour == 15
