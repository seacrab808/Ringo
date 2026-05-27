"""
Async natural-language schedule parser via local Ollama API.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import date as Date
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import httpx
from pydantic import ValidationError

from app.config import Settings, get_settings
from app.core.exceptions import OllamaConnectionError, OllamaParseError
from app.schemas.schedule import (
    CalendarDateTime,
    EventCategory,
    NaturalLanguageParseRequest,
    NaturalLanguageParseResponse,
    ParsedScheduleEvent,
    RecurrenceRule,
    ScheduleKind,
    parsed_event_json_schema,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Ringo, a Korean personal schedule parser for a Motemote-style planner.
Convert the user's Korean natural language into structured JSON.

Rules:
1. Output ONLY valid JSON matching the schema. No markdown.
2. `summary` = full task title for the left column (required).
3. `timetable_label` = optional shorter label for the right timetable (omit to use summary).
4. Schedule kinds:
   - schedule_kind "timed" + is_time_fixed true: specific clock time → fill start.date_time; omit end unless user said end time.
   - schedule_kind "deadline": "까지" phrases → fill deadline (date or date_time), is_time_fixed false.
   - schedule_kind "flexible": no time and no deadline.
5. Relative dates ("이번주 금요일", "내일") use reference_date and timezone Asia/Seoul.
6. `category` = lowercase slug string. Prefer: class, ta, research, health, personal, other — or infer slug for 외주→outsourcing, 회의→meeting, 개인일정→personal.
7. Recurring classes: recurrence_rule WEEKLY, by_day, by_hour, semester_start/end when term dates given.
8. Multiple events in one sentence → multiple objects in `events`.
9. Unclear parts → unparsed_fragments array.

Examples:
- "이번주 금요일 오후 2시 딥러닝 수업" → timed, summary="딥러닝 수업", category="class", start 14:00 that Friday.
- "이번주 금요일까지 보고서" → deadline, summary="보고서", deadline that Friday end of day, is_time_fixed false.
- "소프트웨어공학 수업" (recurring) → summary="소프트웨어공학 수업", recurrence_rule weekly.
"""


def _build_user_prompt(req: NaturalLanguageParseRequest, ref: date) -> str:
    schema = json.dumps(parsed_event_json_schema(), ensure_ascii=False)
    return (
        f"reference_date: {ref.isoformat()}\n"
        f"timezone: {req.timezone}\n"
        f"allow_multiple_events: {req.allow_multiple_events}\n\n"
        f"JSON schema for your response:\n{schema}\n\n"
        f"User message:\n{req.text.strip()}"
    )


def _parse_iso_datetime(value: str | None, tz: str) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo(tz))
        return dt
    except ValueError:
        return None


def _parse_iso_date(value: str | None) -> Date | None:
    if not value:
        return None
    try:
        return Date.fromisoformat(value[:10])
    except ValueError:
        return None


def _coerce_calendar_dt(
    raw: dict[str, Any] | None,
    default_tz: str,
) -> CalendarDateTime | None:
    if not raw or not isinstance(raw, dict):
        return None
    d = _parse_iso_date(raw.get("date"))
    dt = _parse_iso_datetime(raw.get("date_time"), raw.get("time_zone") or default_tz)
    if d is None and dt is None:
        return None
    return CalendarDateTime(
        all_day_date=d,
        date_time=dt,
        time_zone=raw.get("time_zone") or default_tz,
    )


def _coerce_recurrence(raw: dict[str, Any] | None) -> RecurrenceRule | None:
    if not raw or not isinstance(raw, dict):
        return None
    by_day = raw.get("by_day") or []
    if isinstance(by_day, str):
        by_day = [by_day]
    return RecurrenceRule(
        frequency=raw.get("frequency") or "WEEKLY",
        by_day=list(by_day),
        by_hour=raw.get("by_hour"),
        by_minute=raw.get("by_minute"),
        count=raw.get("count"),
        until=_parse_iso_date(raw.get("until")),
        semester_start=_parse_iso_date(raw.get("semester_start")),
        semester_end=_parse_iso_date(raw.get("semester_end")),
        rrule=raw.get("rrule"),
    )


def _coerce_category_slug(value: str | None) -> str:
    if not value:
        return EventCategory.OTHER.value
    slug = value.lower().strip().replace(" ", "_")
    try:
        return EventCategory(slug).value
    except ValueError:
        return slug


def _coerce_schedule_kind(raw: dict[str, Any], is_fixed: bool, has_deadline: bool) -> ScheduleKind:
    kind = raw.get("schedule_kind")
    if kind:
        try:
            return ScheduleKind(str(kind).lower())
        except ValueError:
            pass
    if is_fixed:
        return ScheduleKind.TIMED
    if has_deadline:
        return ScheduleKind.DEADLINE
    return ScheduleKind.FLEXIBLE


def _coerce_event(raw: dict[str, Any], user_text: str, tz: str) -> ParsedScheduleEvent:
    start = _coerce_calendar_dt(raw.get("start"), tz)
    end = _coerce_calendar_dt(raw.get("end"), tz)
    deadline = _coerce_calendar_dt(raw.get("deadline"), tz)
    is_fixed = bool(raw.get("is_time_fixed", False))
    if start is not None and start.date_time is not None and not is_fixed:
        is_fixed = True

    kind = _coerce_schedule_kind(raw, is_fixed, deadline is not None)
    ev = ParsedScheduleEvent(
        summary=str(raw.get("summary", "")).strip(),
        description=raw.get("description"),
        location=raw.get("location"),
        start=start,
        end=end,
        recurrence=raw.get("recurrence"),
        recurrence_rule=_coerce_recurrence(raw.get("recurrence_rule")),
        color_id=raw.get("color_id"),
        schedule_kind=kind,
        is_time_fixed=is_fixed,
        is_all_day=bool(raw.get("is_all_day", False)),
        deadline=deadline,
        timetable_label=raw.get("timetable_label"),
        category=_coerce_category_slug(raw.get("category")),
        category_color=raw.get("category_color"),
        confidence=float(raw.get("confidence", 0.8)),
        raw_user_text=user_text,
        parsing_notes=raw.get("parsing_notes"),
    )
    return ev.with_default_end()


class OllamaScheduleParser:
    """Calls Ollama /api/chat asynchronously and validates structured events."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._client = client

    def _reference_date(self, req: NaturalLanguageParseRequest) -> Date:
        if req.reference_date is not None:
            return req.reference_date
        return datetime.now(ZoneInfo(req.timezone)).date()

    async def parse(
        self,
        req: NaturalLanguageParseRequest,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> NaturalLanguageParseResponse:
        ref = self._reference_date(req)
        t0 = time.perf_counter()

        raw_json = await self._call_ollama(req, ref, client=client)
        events, unparsed = self._extract_events(raw_json, req.text, req.timezone)

        latency_ms = (time.perf_counter() - t0) * 1000
        return NaturalLanguageParseResponse(
            events=events,
            model=self._settings.ollama_model,
            latency_ms=round(latency_ms, 2),
            reference_date=ref,
            timezone=req.timezone,
            unparsed_fragments=unparsed,
        )

    async def _call_ollama(
        self,
        req: NaturalLanguageParseRequest,
        ref: Date,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> dict[str, Any]:
        url = f"{self._settings.ollama_base_url.rstrip('/')}/api/chat"
        payload = {
            "model": self._settings.ollama_model,
            "stream": False,
            "format": "json",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(req, ref)},
            ],
            "options": {
                "temperature": 0.1,
                "num_predict": self._settings.ollama_num_predict,
            },
        }

        http = client or self._client
        owns_client = http is None
        if owns_client:
            timeout = httpx.Timeout(self._settings.ollama_timeout_seconds)
            http = httpx.AsyncClient(timeout=timeout)

        try:
            assert http is not None
            resp = await http.post(url, json=payload)
            resp.raise_for_status()
            body = resp.json()
        except httpx.HTTPError as exc:
            logger.exception("Ollama request failed")
            raise OllamaConnectionError(f"Ollama unreachable: {exc}") from exc
        finally:
            if owns_client and http is not None:
                await http.aclose()

        content = body.get("message", {}).get("content", "")
        if not content:
            raise OllamaParseError("Empty response from Ollama")

        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise OllamaParseError(f"Invalid JSON from model: {content[:200]}") from exc

    def _extract_events(
        self,
        data: dict[str, Any],
        user_text: str,
        tz: str,
    ) -> tuple[list[ParsedScheduleEvent], list[str]]:
        unparsed: list[str] = list(data.get("unparsed_fragments") or [])
        raw_events = data.get("events")
        if raw_events is None and "summary" in data:
            raw_events = [data]
        if not raw_events:
            return [], unparsed

        events: list[ParsedScheduleEvent] = []
        for item in raw_events:
            if not isinstance(item, dict):
                continue
            try:
                ev = _coerce_event(item, user_text, tz)
                ParsedScheduleEvent.model_validate(ev.model_dump())
                events.append(ev)
            except (ValidationError, ValueError) as exc:
                logger.warning("Skipping invalid event: %s", exc)
                unparsed.append(str(item.get("summary", item)))

        return events, unparsed

    async def health_check(self, *, client: httpx.AsyncClient | None = None) -> bool:
        """Lightweight Ollama availability check."""
        url = f"{self._settings.ollama_base_url.rstrip('/')}/api/tags"
        http = client
        owns = http is None
        if owns:
            http = httpx.AsyncClient(timeout=httpx.Timeout(5.0))
        try:
            assert http is not None
            resp = await http.get(url)
            return resp.status_code == 200
        except httpx.HTTPError:
            return False
        finally:
            if owns and http is not None:
                await http.aclose()
