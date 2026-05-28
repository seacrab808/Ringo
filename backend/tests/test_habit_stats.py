from datetime import date

from app.repositories.habits_local import HabitLogRecord, HabitRecord
from app.services.habit_stats import compute_stats


HID = "11111111-1111-1111-1111-111111111111"


def _habit(**kw) -> HabitRecord:
    base = dict(
        id=HID,
        slug="test",
        name="Test",
        emoji="✅",
        frequency="daily",
        target_count=1,
        enabled=True,
        auto_github=False,
        sort_order=0,
    )
    base.update(kw)
    return HabitRecord(**base)


def test_daily_week_counts_days_in_week():
    h = _habit(frequency="daily")
    logs = [
        HabitLogRecord(
            id="l1",
            habit_id=HID,
            log_date="2026-05-26",
            completed=True,
            source="manual",
            note="",
            created_at="",
        ),
        HabitLogRecord(
            id="l2",
            habit_id=HID,
            log_date="2026-05-28",
            completed=True,
            source="manual",
            note="",
            created_at="",
        ),
    ]
    stats = compute_stats(
        [h],
        logs,
        anchor_date=date(2026, 5, 28),
        view="week",
    )
    assert stats[0].completed_count == 2
    assert stats[0].target_count == 7
    assert not stats[0].met
