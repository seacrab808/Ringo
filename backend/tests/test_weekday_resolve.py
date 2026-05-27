from datetime import date

from app.services.ollama_parser import _resolve_target_date_from_weekday


def test_this_week_friday_from_wednesday():
    ref = date(2026, 5, 27)  # Wednesday
    assert ref.weekday() == 2
    target = _resolve_target_date_from_weekday("이번주 금요일 오후 1시 세미나", ref)
    assert target == date(2026, 5, 29)  # Friday


def test_next_week_friday():
    ref = date(2026, 5, 27)
    target = _resolve_target_date_from_weekday("다음주 금요일 미팅", ref)
    assert target == date(2026, 6, 5)
