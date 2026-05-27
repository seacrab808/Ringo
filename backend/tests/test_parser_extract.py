"""Parser extraction edge cases (no live Ollama)."""

from app.services.ollama_parser import OllamaScheduleParser, _coerce_event


def test_root_summary_applied_to_events_without_summary():
    parser = OllamaScheduleParser()
    data = {
        "summary": "AI 교수님 세미나",
        "events": [
            {
                "schedule_kind": "timed",
                "is_time_fixed": True,
                "category": "class",
                "start": {"date_time": "2026-05-30T13:00:00+09:00", "time_zone": "Asia/Seoul"},
                "end": {"date_time": "2026-05-30T17:00:00+09:00", "time_zone": "Asia/Seoul"},
            }
        ],
    }
    user = "이번주 금요일 오후 1시부터 5시까지 AI 교수님 세미나(청강) 있어"
    events, unparsed = parser._extract_events(data, user, "Asia/Seoul")
    assert len(events) == 1
    assert events[0].summary == "AI 교수님 세미나"
    assert events[0].is_time_fixed is True
    assert unparsed == []


def test_coerce_event_infers_summary_from_user_text():
    ev = _coerce_event(
        {"is_time_fixed": True, "start": {"date_time": "2026-05-30T14:00:00+09:00"}},
        "이번주 금요일 2시 딥러닝 수업",
        "Asia/Seoul",
    )
    assert "딥러닝" in ev.summary or ev.summary == "새 일정"
