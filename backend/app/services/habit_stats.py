from __future__ import annotations

from datetime import date, timedelta
from uuid import UUID

from app.repositories.habits_local import HabitLogRecord, HabitRecord
from app.schemas.habits import HabitFrequency, HabitPeriodStats


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _month_key(d: date) -> str:
    return d.strftime("%Y-%m")


def _week_key(d: date) -> str:
    return _week_start(d).isoformat()


def period_key_for_habit(habit: HabitRecord, d: date) -> str:
    freq = habit.frequency
    if freq == HabitFrequency.WEEKLY.value:
        return _week_key(d)
    if freq == HabitFrequency.MONTHLY.value:
        return _month_key(d)
    return d.isoformat()


def _days_in_month(d: date) -> int:
    if d.month == 12:
        nxt = d.replace(year=d.year + 1, month=1, day=1)
    else:
        nxt = d.replace(month=d.month + 1, day=1)
    return (nxt - timedelta(days=1)).day


def compute_stats(
    habits: list[HabitRecord],
    logs: list[HabitLogRecord],
    *,
    anchor_date: date,
    view: str,
) -> list[HabitPeriodStats]:
    enabled = [h for h in habits if h.enabled]
    ws = _week_start(anchor_date)
    we = ws + timedelta(days=6)

    targets: dict[str, tuple[str, int]] = {}
    for h in enabled:
        if view == "day":
            pk = period_key_for_habit(h, anchor_date)
            target = h.target_count
        elif view == "week":
            pk = _week_key(ws)
            if h.frequency == HabitFrequency.DAILY.value:
                target = 7
            else:
                target = h.target_count
        else:
            pk = _month_key(anchor_date)
            if h.frequency == HabitFrequency.DAILY.value:
                target = _days_in_month(anchor_date)
            else:
                target = h.target_count
        targets[h.id] = (pk, target)

    counts: dict[str, int] = {h.id: 0 for h in enabled}
    for lg in logs:
        if not lg.completed:
            continue
        h = next((x for x in enabled if x.id == lg.habit_id), None)
        if not h:
            continue
        ld = date.fromisoformat(lg.log_date)
        pk, _ = targets[h.id]

        if view == "day":
            if period_key_for_habit(h, ld) == pk:
                counts[h.id] += 1
        elif view == "week":
            if ws <= ld <= we:
                counts[h.id] += 1
        else:
            if _month_key(ld) == pk:
                counts[h.id] += 1

    out: list[HabitPeriodStats] = []
    for h in enabled:
        pk, target = targets[h.id]
        done = counts.get(h.id, 0)
        out.append(
            HabitPeriodStats(
                habit_id=UUID(h.id),
                period_key=pk,
                completed_count=done,
                target_count=target,
                met=done >= target,
            )
        )
    return out
