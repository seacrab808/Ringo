from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import get_settings
from app.core.deps import verify_api_token
from app.schemas.habits import (
    GitHubSettingsOut,
    GitHubSettingsUpdate,
    GitHubSyncRequest,
    GitHubSyncResponse,
    HabitCreate,
    HabitFrequency,
    HabitLogOut,
    HabitLogUpsert,
    HabitOut,
    HabitsBundleOut,
    HabitUpdate,
)
from app.services.github_commits import fetch_commit_dates
from app.services.habit_stats import compute_stats
from app.services.habit_store import get_habit_store

router = APIRouter(prefix="/habits", tags=["habits"])


def _habit_out(h) -> HabitOut:
    return HabitOut(
        id=UUID(h.id),
        slug=h.slug,
        name=h.name,
        emoji=h.emoji,
        frequency=HabitFrequency(h.frequency),
        target_count=h.target_count,
        enabled=h.enabled,
        auto_github=h.auto_github,
        sort_order=h.sort_order,
    )


def _log_out(lg) -> HabitLogOut:
    created = None
    if lg.created_at:
        try:
            created = datetime.fromisoformat(lg.created_at.replace("Z", "+00:00"))
        except ValueError:
            created = None
    return HabitLogOut(
        id=UUID(lg.id),
        habit_id=UUID(lg.habit_id),
        log_date=date.fromisoformat(lg.log_date),
        completed=lg.completed,
        source=lg.source,
        note=lg.note,
        created_at=created,
    )


def _date_range(view: str, anchor: date) -> tuple[date, date]:
    if view == "week":
        start = anchor - timedelta(days=anchor.weekday())
        return start, start + timedelta(days=6)
    if view == "month":
        start = anchor.replace(day=1)
        if anchor.month == 12:
            end = anchor.replace(year=anchor.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = anchor.replace(month=anchor.month + 1, day=1) - timedelta(days=1)
        return start, end
    return anchor, anchor


@router.get("", response_model=HabitsBundleOut)
def list_habits_bundle(
    anchor_date: date | None = None,
    view: str = Query(default="week", pattern="^(day|week|month)$"),
    _: None = Depends(verify_api_token),
) -> HabitsBundleOut:
    store = get_habit_store()
    anchor = anchor_date or date.today()
    d_from, d_to = _date_range(view, anchor)
    habits = store.list_habits()
    logs = store.list_logs(d_from, d_to)
    stats = compute_stats(habits, logs, anchor_date=anchor, view=view)
    return HabitsBundleOut(
        habits=[_habit_out(h) for h in habits],
        logs=[_log_out(lg) for lg in logs],
        stats=stats,
    )


@router.post("", response_model=HabitOut)
def create_habit(
    body: HabitCreate,
    _: None = Depends(verify_api_token),
) -> HabitOut:
    store = get_habit_store()
    h = store.create_habit(
        name=body.name,
        emoji=body.emoji,
        frequency=body.frequency.value,
        target_count=body.target_count,
    )
    return _habit_out(h)


@router.patch("/{habit_id}", response_model=HabitOut)
def update_habit(
    habit_id: UUID,
    body: HabitUpdate,
    _: None = Depends(verify_api_token),
) -> HabitOut:
    store = get_habit_store()
    patch = body.model_dump(exclude_unset=True)
    if "frequency" in patch and patch["frequency"] is not None:
        patch["frequency"] = patch["frequency"].value
    h = store.update_habit(str(habit_id), **patch)
    if not h:
        raise HTTPException(status_code=404, detail="Habit not found")
    return _habit_out(h)


@router.put("/{habit_id}/log", response_model=HabitLogOut)
def upsert_habit_log(
    habit_id: UUID,
    body: HabitLogUpsert,
    _: None = Depends(verify_api_token),
) -> HabitLogOut:
    store = get_habit_store()
    if not store.get_habit(str(habit_id)):
        raise HTTPException(status_code=404, detail="Habit not found")
    lg = store.upsert_log(
        str(habit_id),
        body.log_date,
        completed=body.completed,
        source="manual",
        note=body.note,
    )
    return _log_out(lg)


@router.get("/github/settings", response_model=GitHubSettingsOut)
def get_github_settings(_: None = Depends(verify_api_token)) -> GitHubSettingsOut:
    settings = get_settings()
    store = get_habit_store()
    username, sync_at, msg = store.get_github_settings()
    env_user = settings.github_username.strip()
    effective = username or env_user
    return GitHubSettingsOut(
        username=effective,
        configured=bool(settings.github_token.strip() and effective),
        last_sync_at=sync_at,
        last_sync_message=msg,
    )


@router.put("/github/settings", response_model=GitHubSettingsOut)
def update_github_settings(
    body: GitHubSettingsUpdate,
    _: None = Depends(verify_api_token),
) -> GitHubSettingsOut:
    store = get_habit_store()
    store.set_github_settings(body.username.strip())
    return get_github_settings()


@router.post("/github/sync", response_model=GitHubSyncResponse)
async def sync_github_commits(
    body: GitHubSyncRequest | None = None,
    _: None = Depends(verify_api_token),
) -> GitHubSyncResponse:
    settings = get_settings()
    token = settings.github_token.strip()
    store = get_habit_store()
    username, _, _ = store.get_github_settings()
    username = username or settings.github_username.strip()
    if not username:
        raise HTTPException(
            status_code=400,
            detail="GitHub 사용자명을 설정해 주세요 (습관 페이지 또는 GITHUB_USERNAME).",
        )
    if not token:
        raise HTTPException(
            status_code=400,
            detail="GITHUB_TOKEN이 backend/.env에 설정되어 있지 않습니다 (repo 또는 public read).",
        )

    today = date.today()
    req = body or GitHubSyncRequest()
    d_to = req.date_to or today
    d_from = req.date_from or (d_to - timedelta(days=13))

    commit_days = await fetch_commit_dates(
        username,
        token=token,
        date_from=d_from,
        date_to=d_to,
    )
    git_habit = store.get_habit_by_slug("git_commit")
    updated = 0
    if git_habit:
        for d in commit_days:
            store.upsert_log(
                git_habit.id,
                d,
                completed=True,
                source="github",
            )
            updated += 1

    now = datetime.now(timezone.utc).isoformat()
    msg = f"{len(commit_days)}일 커밋 감지 ({d_from} ~ {d_to})"
    store.set_github_settings(username, sync_at=now, message=msg)

    return GitHubSyncResponse(
        username=username,
        days_checked=(d_to - d_from).days + 1,
        days_with_commits=sorted(d.isoformat() for d in commit_days),
        logs_updated=updated,
        message=msg,
    )
