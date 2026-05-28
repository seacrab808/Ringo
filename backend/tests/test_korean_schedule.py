from datetime import date

from app.schemas.schedule import ParsedScheduleEvent
from app.services.korean_schedule import (
    apply_user_time_range,
    dedupe_similar_events,
    normalize_korean_text,
    parse_korean_time_range,
)


def test_normalize_hanja():
    assert normalize_korean_text("教授님 세미나") == "교수님 세미나"


def test_time_range_afternoon_inference():
    r = parse_korean_time_range("이번주 금요일 1시부터 5시에 교수님 세미나")
    assert r == (13, 0, 17, 0)


def test_time_range_explicit_pm():
    r = parse_korean_time_range("오후 1시부터 5시까지")
    assert r == (13, 0, 17, 0)


def test_apply_user_time_range():
    ev = ParsedScheduleEvent(summary="교수님 세미나", is_time_fixed=True)
    out = apply_user_time_range(
        ev,
        "이번주 금요일 1시부터 5시에 교수님 세미나",
        date(2026, 5, 29),
        "Asia/Seoul",
    )
    assert out.start and out.start.date_time
    assert out.end and out.end.date_time
    assert out.start.date_time.hour == 13
    assert out.end.date_time.hour == 17


def test_dedupe_similar():
    a = ParsedScheduleEvent(summary="교수님 세미나", is_time_fixed=True)
    b = ParsedScheduleEvent(summary="教授님 세미나 (방청)", is_time_fixed=False)
    merged = dedupe_similar_events([a, b])
    assert len(merged) == 1
    assert "교수" in merged[0].summary
