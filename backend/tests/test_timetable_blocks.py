from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.services.timetable_blocks import build_timetable_for_day


def test_block_on_motemote_axis():
    tz = ZoneInfo("Asia/Seoul")
    day = date(2026, 5, 27)
    start = datetime(2026, 5, 27, 14, 0, tzinfo=tz)
    end = datetime(2026, 5, 27, 15, 0, tzinfo=tz)
    rows = [
        {
            "id": "00000000-0000-4000-8000-000000000001",
            "summary": "딥러닝 수업",
            "timetable_label": "딥러닝",
            "is_time_fixed": True,
            "category": "class",
            "category_color": "#93C5FD",
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
        }
    ]
    out = build_timetable_for_day(rows, day)
    assert out.slot_count == 24
    assert len(out.blocks) == 1
    assert out.blocks[0].start_slot == 8  # 14:00 is 8h after 06:00
    assert out.blocks[0].span == 1
