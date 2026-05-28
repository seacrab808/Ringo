from datetime import date

from app.schemas.recurrence import TaskRecurrence
from app.services.recurrence_expand import iter_occurrence_dates, occurs_on_date


def test_weekly_friday_in_semester():
    rule = TaskRecurrence(
        frequency="WEEKLY",
        by_day=["FR"],
        by_hour=14,
        semester_start=date(2026, 5, 1),
        semester_end=date(2026, 5, 31),
    )
    assert occurs_on_date(rule, date(2026, 5, 29))
    assert not occurs_on_date(rule, date(2026, 5, 28))
    days = iter_occurrence_dates(rule, date(2026, 5, 1), date(2026, 5, 31))
    assert date(2026, 5, 29) in days


def test_cancelled_date():
    rule = TaskRecurrence(
        by_day=["FR"],
        semester_start=date(2026, 5, 1),
        semester_end=date(2026, 5, 31),
        cancelled_dates=[date(2026, 5, 29)],
    )
    assert not occurs_on_date(rule, date(2026, 5, 29))
