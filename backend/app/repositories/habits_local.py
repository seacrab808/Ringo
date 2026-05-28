from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path

from app.schemas.habits import HabitFrequency

DEFAULT_HABITS: list[dict] = [
    {
        "slug": "git_commit",
        "name": "Git 커밋",
        "emoji": "💻",
        "frequency": HabitFrequency.DAILY.value,
        "target_count": 1,
        "auto_github": True,
        "sort_order": 0,
    },
    {
        "slug": "supplements",
        "name": "영양제",
        "emoji": "💊",
        "frequency": HabitFrequency.DAILY.value,
        "target_count": 1,
        "sort_order": 1,
    },
    {
        "slug": "cake",
        "name": "Cake",
        "emoji": "🍰",
        "frequency": HabitFrequency.DAILY.value,
        "target_count": 1,
        "sort_order": 2,
    },
    {
        "slug": "duolingo",
        "name": "듀오링고",
        "emoji": "🦉",
        "frequency": HabitFrequency.DAILY.value,
        "target_count": 1,
        "sort_order": 3,
    },
    {
        "slug": "skincare",
        "name": "피부 관리",
        "emoji": "✨",
        "frequency": HabitFrequency.DAILY.value,
        "target_count": 1,
        "sort_order": 4,
    },
    {
        "slug": "pilates",
        "name": "필라테스",
        "emoji": "🧘",
        "frequency": HabitFrequency.WEEKLY.value,
        "target_count": 2,
        "sort_order": 5,
    },
    {
        "slug": "chiropractic",
        "name": "도수치료",
        "emoji": "🏥",
        "frequency": HabitFrequency.MONTHLY.value,
        "target_count": 2,
        "sort_order": 6,
    },
]


@dataclass
class HabitRecord:
    id: str
    slug: str
    name: str
    emoji: str
    frequency: str
    target_count: int
    enabled: bool
    auto_github: bool
    sort_order: int

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class HabitLogRecord:
    id: str
    habit_id: str
    log_date: str
    completed: bool
    source: str
    note: str
    created_at: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class HabitsStoreData:
    habits: list[HabitRecord] = field(default_factory=list)
    logs: list[HabitLogRecord] = field(default_factory=list)
    github_username: str = ""
    last_github_sync_at: str | None = None
    last_github_sync_message: str | None = None


class HabitsLocalStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self._path = self.root / "habits.json"

    def _load(self) -> HabitsStoreData:
        if not self._path.is_file():
            data = HabitsStoreData()
            self._seed_defaults(data)
            self._save(data)
            return data
        raw = json.loads(self._path.read_text(encoding="utf-8"))
        data = HabitsStoreData(
            github_username=raw.get("github_username", ""),
            last_github_sync_at=raw.get("last_github_sync_at"),
            last_github_sync_message=raw.get("last_github_sync_message"),
        )
        for h in raw.get("habits", []):
            data.habits.append(HabitRecord(**h))
        for lg in raw.get("logs", []):
            data.logs.append(HabitLogRecord(**lg))
        if not data.habits:
            self._seed_defaults(data)
            self._save(data)
        return data

    def _save(self, data: HabitsStoreData) -> None:
        payload = {
            "github_username": data.github_username,
            "last_github_sync_at": data.last_github_sync_at,
            "last_github_sync_message": data.last_github_sync_message,
            "habits": [h.to_dict() for h in data.habits],
            "logs": [lg.to_dict() for lg in data.logs],
        }
        self._path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _seed_defaults(self, data: HabitsStoreData) -> None:
        for d in DEFAULT_HABITS:
            auto = bool(d.get("auto_github"))
            fields = {k: v for k, v in d.items() if k != "auto_github"}
            data.habits.append(
                HabitRecord(
                    id=str(uuid.uuid4()),
                    enabled=True,
                    auto_github=auto,
                    **fields,
                )
            )

    def list_habits(self) -> list[HabitRecord]:
        data = self._load()
        return sorted(data.habits, key=lambda h: h.sort_order)

    def get_habit(self, habit_id: str) -> HabitRecord | None:
        for h in self.list_habits():
            if h.id == habit_id:
                return h
        return None

    def get_habit_by_slug(self, slug: str) -> HabitRecord | None:
        for h in self.list_habits():
            if h.slug == slug:
                return h
        return None

    def create_habit(self, *, name: str, emoji: str, frequency: str, target_count: int) -> HabitRecord:
        data = self._load()
        slug = name.lower().replace(" ", "_")[:40]
        base = slug
        n = 1
        while any(h.slug == slug for h in data.habits):
            slug = f"{base}_{n}"
            n += 1
        habit = HabitRecord(
            id=str(uuid.uuid4()),
            slug=slug,
            name=name,
            emoji=emoji,
            frequency=frequency,
            target_count=target_count,
            enabled=True,
            auto_github=False,
            sort_order=max((h.sort_order for h in data.habits), default=-1) + 1,
        )
        data.habits.append(habit)
        self._save(data)
        return habit

    def update_habit(self, habit_id: str, **patch) -> HabitRecord | None:
        data = self._load()
        for i, h in enumerate(data.habits):
            if h.id != habit_id:
                continue
            updated = HabitRecord(**{**h.to_dict(), **patch})
            data.habits[i] = updated
            self._save(data)
            return updated
        return None

    def list_logs(self, date_from: date, date_to: date) -> list[HabitLogRecord]:
        data = self._load()
        out = []
        for lg in data.logs:
            d = date.fromisoformat(lg.log_date)
            if date_from <= d <= date_to:
                out.append(lg)
        return out

    def upsert_log(
        self,
        habit_id: str,
        log_date: date,
        *,
        completed: bool,
        source: str = "manual",
        note: str = "",
    ) -> HabitLogRecord:
        data = self._load()
        key = log_date.isoformat()
        for i, lg in enumerate(data.logs):
            if lg.habit_id == habit_id and lg.log_date == key:
                updated = HabitLogRecord(
                    id=lg.id,
                    habit_id=habit_id,
                    log_date=key,
                    completed=completed,
                    source=source if completed else lg.source,
                    note=note or lg.note,
                    created_at=lg.created_at,
                )
                data.logs[i] = updated
                self._save(data)
                return updated
        rec = HabitLogRecord(
            id=str(uuid.uuid4()),
            habit_id=habit_id,
            log_date=key,
            completed=completed,
            source=source,
            note=note,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        data.logs.append(rec)
        self._save(data)
        return rec

    def get_github_settings(self) -> tuple[str, str | None, str | None]:
        data = self._load()
        return data.github_username, data.last_github_sync_at, data.last_github_sync_message

    def set_github_settings(
        self,
        username: str,
        *,
        sync_at: str | None = None,
        message: str | None = None,
    ) -> None:
        data = self._load()
        data.github_username = username
        if sync_at is not None:
            data.last_github_sync_at = sync_at
        if message is not None:
            data.last_github_sync_message = message
        self._save(data)
