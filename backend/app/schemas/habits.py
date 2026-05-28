from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class HabitFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class HabitOut(BaseModel):
    id: UUID
    slug: str
    name: str
    emoji: str = "✅"
    frequency: HabitFrequency
    target_count: int = 1
    enabled: bool = True
    auto_github: bool = False
    sort_order: int = 0


class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    emoji: str = Field(default="✅", max_length=8)
    frequency: HabitFrequency = HabitFrequency.DAILY
    target_count: int = Field(default=1, ge=1, le=31)
    enabled: bool = True


class HabitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    emoji: str | None = Field(default=None, max_length=8)
    frequency: HabitFrequency | None = None
    target_count: int | None = Field(default=None, ge=1, le=31)
    enabled: bool | None = None


class HabitLogOut(BaseModel):
    id: UUID
    habit_id: UUID
    log_date: date
    completed: bool
    source: str = "manual"
    note: str = ""
    created_at: datetime | None = None


class HabitLogUpsert(BaseModel):
    log_date: date
    completed: bool
    note: str = ""


class HabitPeriodStats(BaseModel):
    habit_id: UUID
    period_key: str
    completed_count: int
    target_count: int
    met: bool


class HabitsBundleOut(BaseModel):
    habits: list[HabitOut]
    logs: list[HabitLogOut]
    stats: list[HabitPeriodStats] = Field(default_factory=list)


class GitHubSettingsOut(BaseModel):
    username: str
    configured: bool
    last_sync_at: str | None = None
    last_sync_message: str | None = None


class GitHubSettingsUpdate(BaseModel):
    username: str = Field(..., min_length=1, max_length=39)


class GitHubSyncRequest(BaseModel):
    date_from: date | None = None
    date_to: date | None = None


class GitHubSyncResponse(BaseModel):
    username: str
    days_checked: int
    days_with_commits: list[str]
    logs_updated: int
    message: str
