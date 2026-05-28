from datetime import date

from app.services.report_period import month_range, period_title, week_range


def test_week_range_monday_sunday():
    start, end = week_range(date(2026, 5, 28))
    assert start == date(2026, 5, 25)
    assert end == date(2026, 5, 31)


def test_month_range():
    start, end = month_range(date(2026, 5, 15))
    assert start == date(2026, 5, 1)
    assert end == date(2026, 5, 31)


def test_period_title():
    assert "주간" in period_title("week", date(2026, 5, 25), date(2026, 5, 31))
    assert "5월" in period_title("month", date(2026, 5, 1), date(2026, 5, 31))
