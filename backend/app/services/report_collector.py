from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import date, timedelta

from app.config import Settings, get_settings
from app.repositories import diaries as diary_repo
from app.repositories import tasks as task_repo
from app.schemas.planner import TaskOut
from app.schemas.report import ReportClientContext, ReportClientTaskSnapshot, ReportSummaryStats
from app.services.habit_stats import compute_stats
from app.services.habit_store import get_habit_store
from app.services.recurrence_expand import iter_occurrence_dates, occurs_on_date


@dataclass
class ReportCollectedData:
    start: date
    end: date
    stats: ReportSummaryStats
    context_text: str


def _expand_tasks_in_range(
    tasks: list[TaskOut],
    date_from: date,
    date_to: date,
) -> list[tuple[date, str, str, bool]]:
    """Returns (day, summary, category, completed) per occurrence."""
    rows: list[tuple[date, str, str, bool]] = []
    for t in tasks:
        if t.recurrence:
            rule = t.recurrence
            for d in iter_occurrence_dates(rule, date_from, date_to):
                if rule and occurs_on_date(rule, d):
                    rows.append((d, t.summary, t.category, t.completed))
        elif t.planned_date and date_from <= t.planned_date <= date_to:
            rows.append((t.planned_date, t.summary, t.category, t.completed))
    return rows


def _expand_client_tasks(
    snapshots: list[ReportClientTaskSnapshot],
    date_from: date,
    date_to: date,
) -> list[tuple[date, str, str, bool]]:
    rows: list[tuple[date, str, str, bool]] = []
    for s in snapshots:
        if not s.planned_date:
            continue
        try:
            d = date.fromisoformat(s.planned_date[:10])
        except ValueError:
            continue
        if date_from <= d <= date_to:
            rows.append((d, s.summary, s.category, s.completed))
    return rows


def _diary_snippets(
    diaries: dict[str, str],
    date_from: date,
    date_to: date,
    *,
    max_chars: int = 4000,
) -> list[str]:
    lines: list[str] = []
    total = 0
    d = date_from
    while d <= date_to:
        key = d.isoformat()
        body = (diaries.get(key) or "").strip()
        if body:
            snippet = body if len(body) <= 500 else body[:500] + "…"
            line = f"- {d.strftime('%m/%d')} ({_weekday_ko(d)}): {snippet}"
            if total + len(line) > max_chars:
                lines.append("- … (일기가 많아 일부만 포함)")
                break
            lines.append(line)
            total += len(line)
        d += timedelta(days=1)
    return lines


def _weekday_ko(d: date) -> str:
    return ("월", "화", "수", "목", "금", "토", "일")[d.weekday()]


def collect_report_data(
    *,
    period: str,
    start: date,
    end: date,
    anchor: date,
    client_context: ReportClientContext | None = None,
    settings: Settings | None = None,
) -> ReportCollectedData:
    settings = settings or get_settings()
    view = "week" if period == "week" else "month"

    task_rows: list[tuple[date, str, str, bool]] = []
    diaries: dict[str, str] = {}

    if settings.supabase_enabled:
        try:
            tasks = task_repo.list_tasks(start, end)
            task_rows = _expand_tasks_in_range(tasks, start, end)
            for row in diary_repo.list_diaries(start, end):
                if row.body.strip():
                    diaries[row.diary_date.isoformat()] = row.body
        except Exception:
            pass

    if client_context:
        if not task_rows and client_context.tasks:
            task_rows = _expand_client_tasks(client_context.tasks, start, end)
        for k, v in client_context.diaries.items():
            if v.strip() and k not in diaries:
                diaries[k] = v

    total = len(task_rows)
    completed = sum(1 for _, _, _, done in task_rows if done)
    by_cat = Counter(cat for _, _, cat, _ in task_rows)

    store = get_habit_store(settings)
    habits = store.list_habits()
    logs = store.list_logs(start, end)
    habit_stats = compute_stats(habits, logs, anchor_date=anchor, view=view)
    habits_met = sum(1 for s in habit_stats if s.met)
    habits_total = len(habit_stats)

    git_habit = next((h for h in habits if h.slug == "git_commit" and h.enabled), None)
    github_days: int | None = None
    if git_habit:
        github_days = len(
            {
                lg.log_date
                for lg in logs
                if lg.habit_id == git_habit.id
                and lg.completed
                and start.isoformat() <= lg.log_date <= end.isoformat()
            }
        )

    stats = ReportSummaryStats(
        total_tasks=total,
        completed_tasks=completed,
        diary_days=len([k for k, v in diaries.items() if start.isoformat() <= k <= end.isoformat() and v.strip()]),
        habits_met=habits_met,
        habits_total=habits_total,
        github_commit_days=github_days,
    )

    lines: list[str] = [
        f"기간: {start.isoformat()} ~ {end.isoformat()} ({'주간' if period == 'week' else '월간'})",
        "",
        "## 일정 요약",
        f"- 완료: {completed} / 전체: {total}",
    ]
    if by_cat:
        cat_line = ", ".join(f"{k} {v}건" for k, v in by_cat.most_common(8))
        lines.append(f"- 카테고리: {cat_line}")

    if task_rows:
        lines.append("")
        lines.append("## 일정 목록 (날짜순)")
        for d, summary, cat, done in sorted(task_rows, key=lambda x: (x[0], x[1])):
            mark = "완료" if done else "미완료"
            lines.append(f"- [{mark}] {d.strftime('%m/%d')} {summary} ({cat})")

    diary_lines = _diary_snippets(diaries, start, end)
    lines.append("")
    lines.append("## 일기")
    if diary_lines:
        lines.extend(diary_lines)
    else:
        lines.append("- (이 기간에 작성된 일기 없음)")

    lines.append("")
    lines.append("## 습관")
    if habit_stats:
        habit_by_id = {h.id: h for h in habits if h.enabled}
        for st in habit_stats:
            h = habit_by_id.get(str(st.habit_id))
            if not h:
                continue
            status = "달성" if st.met else "미달"
            lines.append(
                f"- {h.emoji} {h.name}: {st.completed_count}/{st.target_count} ({status})"
            )
    else:
        lines.append("- (등록된 습관 없음)")

    if github_days is not None and github_days > 0:
        lines.append("")
        lines.append("## GitHub")
        lines.append(f"- Git 커밋 습관 체크: {github_days}일")

    return ReportCollectedData(
        start=start,
        end=end,
        stats=stats,
        context_text="\n".join(lines),
    )
