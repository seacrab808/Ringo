"""Unit tests for task sorting (no Ollama required)."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.schemas.schedule import (
    CalendarDateTime,
    EventCategory,
    SortableTask,
    sort_tasks,
)


def _dt(h: int, m: int = 0) -> CalendarDateTime:
    return CalendarDateTime(
        date_time=datetime(2026, 5, 30, h, m, tzinfo=ZoneInfo("Asia/Seoul")),
        time_zone="Asia/Seoul",
    )


def test_sort_fixed_before_unfixed():
    tasks = [
        SortableTask(id="a", summary="메모", is_time_fixed=False, created_order=0),
        SortableTask(
            id="b",
            summary="딥러닝 수업",
            is_time_fixed=True,
            start=_dt(14),
            created_order=1,
        ),
    ]
    sorted_tasks = sort_tasks(tasks)
    assert sorted_tasks[0].id == "b"
    assert sorted_tasks[1].id == "a"


def test_sort_fixed_by_time_ascending():
    tasks = [
        SortableTask(
            id="late",
            summary="저녁",
            is_time_fixed=True,
            start=_dt(19),
            created_order=0,
        ),
        SortableTask(
            id="early",
            summary="오전",
            is_time_fixed=True,
            start=_dt(9),
            created_order=1,
        ),
    ]
    sorted_tasks = sort_tasks(tasks)
    assert [t.id for t in sorted_tasks] == ["early", "late"]


def test_sort_unfixed_by_created_order():
    tasks = [
        SortableTask(id="second", summary="B", is_time_fixed=False, created_order=2),
        SortableTask(id="first", summary="A", is_time_fixed=False, created_order=1),
    ]
    sorted_tasks = sort_tasks(tasks)
    assert [t.id for t in sorted_tasks] == ["first", "second"]
