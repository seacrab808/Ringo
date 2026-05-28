from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


class ReportPeriod(str, Enum):
    WEEK = "week"
    MONTH = "month"


class ReportClientTaskSnapshot(BaseModel):
    summary: str = Field(min_length=1, max_length=500)
    planned_date: str | None = None
    completed: bool = False
    category: str = "other"
    is_recurring: bool = False


class ReportClientContext(BaseModel):
    """localStorage 모드: 프론트가 기간 내 일정·일기 스냅샷 전달."""

    tasks: list[ReportClientTaskSnapshot] = Field(default_factory=list)
    diaries: dict[str, str] = Field(default_factory=dict)


class ReportGenerateRequest(BaseModel):
    period: ReportPeriod
    anchor_date: date | None = None
    refresh: bool = False
    client_context: ReportClientContext | None = None


class ReportSummaryStats(BaseModel):
    total_tasks: int = 0
    completed_tasks: int = 0
    diary_days: int = 0
    habits_met: int = 0
    habits_total: int = 0
    github_commit_days: int | None = None


class ReportOut(BaseModel):
    period: ReportPeriod
    anchor_date: str
    start_date: str
    end_date: str
    title: str
    markdown: str
    summary_stats: ReportSummaryStats = Field(default_factory=ReportSummaryStats)
    model: str = ""
    generated_at: datetime
    cached: bool = False
    error: str | None = None
