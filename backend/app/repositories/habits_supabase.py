from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from app.db.supabase import get_supabase
from app.repositories.habits_local import (
    DEFAULT_HABITS,
    HabitLogRecord,
    HabitRecord,
    HabitsLocalStore,
)


class HabitsSupabaseStore(HabitsLocalStore):
    """Supabase-backed habits; seeds defaults like local store."""

    def __init__(self) -> None:
        self.client = get_supabase()
        self._ensure_seeded()

    def _ensure_seeded(self) -> None:
        rows = self.client.table("ringo_habits").select("id").limit(1).execute()
        if rows.data:
            return
        for d in DEFAULT_HABITS:
            auto = bool(d.get("auto_github"))
            fields = {k: v for k, v in d.items() if k != "auto_github"}
            self.client.table("ringo_habits").insert(
                {
                    "id": str(uuid.uuid4()),
                    "enabled": True,
                    "auto_github": auto,
                    **fields,
                }
            ).execute()

    def _habit_from_row(self, row: dict) -> HabitRecord:
        return HabitRecord(
            id=str(row["id"]),
            slug=row["slug"],
            name=row["name"],
            emoji=row.get("emoji") or "✅",
            frequency=row["frequency"],
            target_count=int(row.get("target_count") or 1),
            enabled=bool(row.get("enabled", True)),
            auto_github=bool(row.get("auto_github")),
            sort_order=int(row.get("sort_order") or 0),
        )

    def _log_from_row(self, row: dict) -> HabitLogRecord:
        return HabitLogRecord(
            id=str(row["id"]),
            habit_id=str(row["habit_id"]),
            log_date=row["log_date"],
            completed=bool(row["completed"]),
            source=row.get("source") or "manual",
            note=row.get("note") or "",
            created_at=row.get("created_at") or "",
        )

    def list_habits(self) -> list[HabitRecord]:
        rows = (
            self.client.table("ringo_habits")
            .select("*")
            .order("sort_order")
            .execute()
        )
        return [self._habit_from_row(r) for r in rows.data or []]

    def get_habit(self, habit_id: str) -> HabitRecord | None:
        row = (
            self.client.table("ringo_habits")
            .select("*")
            .eq("id", habit_id)
            .maybe_single()
            .execute()
        )
        if not row.data:
            return None
        return self._habit_from_row(row.data)

    def get_habit_by_slug(self, slug: str) -> HabitRecord | None:
        row = (
            self.client.table("ringo_habits")
            .select("*")
            .eq("slug", slug)
            .maybe_single()
            .execute()
        )
        if not row.data:
            return None
        return self._habit_from_row(row.data)

    def create_habit(self, *, name: str, emoji: str, frequency: str, target_count: int) -> HabitRecord:
        slug = name.lower().replace(" ", "_")[:40]
        hid = str(uuid.uuid4())
        order = len(self.list_habits())
        row = {
            "id": hid,
            "slug": slug,
            "name": name,
            "emoji": emoji,
            "frequency": frequency,
            "target_count": target_count,
            "enabled": True,
            "auto_github": False,
            "sort_order": order,
        }
        self.client.table("ringo_habits").insert(row).execute()
        return self._habit_from_row(row)

    def update_habit(self, habit_id: str, **patch) -> HabitRecord | None:
        if not patch:
            return self.get_habit(habit_id)
        self.client.table("ringo_habits").update(patch).eq("id", habit_id).execute()
        return self.get_habit(habit_id)

    def list_logs(self, date_from: date, date_to: date) -> list[HabitLogRecord]:
        rows = (
            self.client.table("ringo_habit_logs")
            .select("*")
            .gte("log_date", date_from.isoformat())
            .lte("log_date", date_to.isoformat())
            .execute()
        )
        return [self._log_from_row(r) for r in rows.data or []]

    def upsert_log(
        self,
        habit_id: str,
        log_date: date,
        *,
        completed: bool,
        source: str = "manual",
        note: str = "",
    ) -> HabitLogRecord:
        existing = (
            self.client.table("ringo_habit_logs")
            .select("*")
            .eq("habit_id", habit_id)
            .eq("log_date", log_date.isoformat())
            .maybe_single()
            .execute()
        )
        if existing.data:
            upd = {
                "completed": completed,
                "note": note or existing.data.get("note") or "",
            }
            if completed:
                upd["source"] = source
            self.client.table("ringo_habit_logs").update(upd).eq(
                "id", existing.data["id"]
            ).execute()
            row = {**existing.data, **upd}
            return self._log_from_row(row)

        row = {
            "id": str(uuid.uuid4()),
            "habit_id": habit_id,
            "log_date": log_date.isoformat(),
            "completed": completed,
            "source": source,
            "note": note,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.client.table("ringo_habit_logs").insert(row).execute()
        return self._log_from_row(row)

    def get_github_settings(self) -> tuple[str, str | None, str | None]:
        row = (
            self.client.table("ringo_habit_settings")
            .select("*")
            .eq("id", 1)
            .maybe_single()
            .execute()
        )
        if not row.data:
            return "", None, None
        d = row.data
        sync_at = d.get("last_github_sync_at")
        return (
            d.get("github_username") or "",
            str(sync_at) if sync_at else None,
            d.get("last_github_sync_message"),
        )

    def set_github_settings(
        self,
        username: str,
        *,
        sync_at: str | None = None,
        message: str | None = None,
    ) -> None:
        payload: dict = {"github_username": username}
        if sync_at is not None:
            payload["last_github_sync_at"] = sync_at
        if message is not None:
            payload["last_github_sync_message"] = message
        self.client.table("ringo_habit_settings").upsert(
            {"id": 1, **payload}
        ).execute()
