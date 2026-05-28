from __future__ import annotations

from datetime import date, timedelta


def week_range(anchor: date) -> tuple[date, date]:
    monday = anchor - timedelta(days=anchor.weekday())
    return monday, monday + timedelta(days=6)


def month_range(anchor: date) -> tuple[date, date]:
    start = anchor.replace(day=1)
    if anchor.month == 12:
        end = anchor.replace(year=anchor.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end = anchor.replace(month=anchor.month + 1, day=1) - timedelta(days=1)
    return start, end


def period_range(period: str, anchor: date) -> tuple[date, date]:
    if period == "month":
        return month_range(anchor)
    return week_range(anchor)


def period_title(period: str, start: date, end: date) -> str:
    if period == "month":
        return f"{start.year}년 {start.month}월 리포트"
    return f"{start.strftime('%m/%d')} ~ {end.strftime('%m/%d')} 주간 리포트"
