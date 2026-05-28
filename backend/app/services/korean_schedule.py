"""
Korean text normalization and time-range heuristics for schedule parsing.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date as Date
from datetime import datetime
from zoneinfo import ZoneInfo

from app.schemas.schedule import CalendarDateTime, ParsedScheduleEvent

# Common Hanja / CJK the model emits instead of Hangul
_HANJA_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    ("教授", "교수"),
    ("學", "학"),
    ("會", "회"),
    ("議", "의"),
    ("研", "연"),
    ("討", "토"),
    ("討論", "토론"),
    ("發", "발"),
    ("表", "표"),
    ("演", "연"),
    ("講", "강"),
    ("課", "과"),
    ("業", "업"),
    ("報", "보"),
    ("告", "고"),
    ("書", "서"),
    ("實", "실"),
    ("驗", "험"),
    ("室", "실"),
    ("院", "원"),
    ("校", "교"),
    ("園", "원"),
    ("館", "관"),
    ("場", "장"),
    ("時", "시"),
    ("間", "간"),
    ("分", "분"),
    ("週", "주"),
    ("月", "월"),
    ("火", "화"),
    ("水", "수"),
    ("木", "목"),
    ("金", "금"),
    ("土", "토"),
    ("日", "일"),
)

_TIME_RANGE_RE = re.compile(
    r"(?:(오전|오후)\s*)?"
    r"(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?"
    r"\s*부터\s*"
    r"(?:(오전|오후)\s*)?"
    r"(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?",
)


def normalize_korean_text(text: str) -> str:
    """Prefer Hangul; fix frequent Hanja slips from the LLM."""
    if not text:
        return text
    out = text.strip()
    for han, hangul in _HANJA_REPLACEMENTS:
        out = out.replace(han, hangul)
    # Drop isolated CJK ideographs (keep Hangul, digits, punctuation, Latin)
    cleaned: list[str] = []
    for ch in out:
        if "\uac00" <= ch <= "\ud7a3":
            cleaned.append(ch)
            continue
        if ch.isascii() or ch in " ·-()[]【】，。、!?…~":
            cleaned.append(ch)
            continue
        if unicodedata.category(ch) in ("Nd", "Pc", "Pd", "Po", "Ps", "Pe", "Zs"):
            cleaned.append(ch)
            continue
        # skip other CJK / kana
    result = re.sub(r"\s+", " ", "".join(cleaned)).strip()
    return result or text.strip()


def _hour_to_24(
    hour: int,
    ampm: str | None,
    *,
    infer_afternoon: bool,
) -> int:
    h = max(0, min(23, hour))
    if ampm == "오후":
        return 12 if h == 12 else h + 12 if h < 12 else h
    if ampm == "오전":
        return 0 if h == 12 else h
    if infer_afternoon and 1 <= h <= 11:
        return h + 12
    return h


def parse_korean_time_range(user_text: str) -> tuple[int, int, int, int] | None:
    """
    Parse '1시부터 5시', '오후 1시부터 5시', etc.
    Returns (start_h, start_m, end_h, end_m) in 24h.
    """
    m = _TIME_RANGE_RE.search(user_text)
    if not m:
        return None

    ampm1, h1s, m1s, ampm2, h2s, m2s = m.groups()
    h1, h2 = int(h1s), int(h2s)
    m1, m2 = int(m1s or 0), int(m2s or 0)

    global_pm = "오후" in user_text and "오전" not in user_text
    implicit_pm = (
        ampm1 is None
        and ampm2 is None
        and not global_pm
        and 1 <= h1 <= 11
        and 1 <= h2 <= 11
        and h1 < h2
    )
    infer_pm = global_pm or implicit_pm

    start_h = _hour_to_24(h1, ampm1, infer_afternoon=infer_pm)
    end_h = _hour_to_24(h2, ampm2, infer_afternoon=infer_pm)
    return start_h, m1, end_h, m2


def _summary_key(summary: str) -> str:
    s = normalize_korean_text(summary).lower()
    s = re.sub(r"\([^)]*\)|（[^）]*）", "", s)
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"[\[\]【】]", "", s)
    return s[:40]


def dedupe_similar_events(events: list[ParsedScheduleEvent]) -> list[ParsedScheduleEvent]:
    """Merge duplicate parses of the same utterance (e.g. two '교수님 세미나')."""
    if len(events) <= 1:
        return events

    groups: dict[str, list[ParsedScheduleEvent]] = {}
    for ev in events:
        key = _summary_key(ev.summary)
        groups.setdefault(key, []).append(ev)

    merged: list[ParsedScheduleEvent] = []
    for group in groups.values():
        if len(group) == 1:
            merged.append(group[0])
            continue
        base = group[0]
        best = base
        for other in group[1:]:
            best = _merge_two_events(best, other)
        merged.append(best)
    return merged


def _merge_two_events(a: ParsedScheduleEvent, b: ParsedScheduleEvent) -> ParsedScheduleEvent:
    """Keep richer summary and widest time span."""
    summary = a.summary if len(a.summary) >= len(b.summary) else b.summary
    summary = normalize_korean_text(summary)

    start_dt = _earliest_start(a, b)
    end_dt = _latest_end(a, b)

    tz = "Asia/Seoul"
    if a.start and a.start.time_zone:
        tz = a.start.time_zone
    elif b.start and b.start.time_zone:
        tz = b.start.time_zone

    is_fixed = a.is_time_fixed or b.is_time_fixed
    if start_dt:
        start = CalendarDateTime(date_time=start_dt, time_zone=tz)
    else:
        start = a.start or b.start

    end = None
    if end_dt and start and start.date_time:
        end = CalendarDateTime(date_time=end_dt, time_zone=start.time_zone)

    data = a.model_dump()
    data.update(
        {
            "summary": summary,
            "timetable_label": normalize_korean_text(a.timetable_label or b.timetable_label or summary)[:12],
            "is_time_fixed": is_fixed,
            "schedule_kind": "timed" if is_fixed and start_dt else a.schedule_kind,
            "start": start.model_dump() if start else None,
            "end": end.model_dump() if end else None,
        }
    )
    return ParsedScheduleEvent.model_validate(data).with_default_end()


def _earliest_start(a: ParsedScheduleEvent, b: ParsedScheduleEvent) -> datetime | None:
    vals = []
    for ev in (a, b):
        if ev.start and ev.start.date_time:
            vals.append(ev.start.date_time)
    return min(vals) if vals else None


def _latest_end(a: ParsedScheduleEvent, b: ParsedScheduleEvent) -> datetime | None:
    vals = []
    for ev in (a, b):
        if ev.end and ev.end.date_time:
            vals.append(ev.end.date_time)
        elif ev.start and ev.start.date_time:
            vals.append(ev.start.date_time)
    return max(vals) if vals else None


def apply_user_time_range(
    event: ParsedScheduleEvent,
    user_text: str,
    reference_date: Date,
    tz: str,
) -> ParsedScheduleEvent:
    """Override model times when user said 'N시부터 M시'."""
    parsed = parse_korean_time_range(user_text)
    if not parsed:
        return _normalize_event_text(event)

    sh, sm, eh, em = parsed
    zone = ZoneInfo(tz)
    start = datetime(
        reference_date.year,
        reference_date.month,
        reference_date.day,
        sh,
        sm,
        tzinfo=zone,
    )
    end = datetime(
        reference_date.year,
        reference_date.month,
        reference_date.day,
        eh,
        em,
        tzinfo=zone,
    )
    if end <= start:
        end = start.replace(hour=min(23, sh + 1))

    data = event.model_dump()
    data.update(
        {
            "is_time_fixed": True,
            "schedule_kind": "timed",
            "start": CalendarDateTime(date_time=start, time_zone=tz).model_dump(),
            "end": CalendarDateTime(date_time=end, time_zone=tz).model_dump(),
        }
    )
    return _normalize_event_text(ParsedScheduleEvent.model_validate(data))


def _normalize_event_text(event: ParsedScheduleEvent) -> ParsedScheduleEvent:
    summary = normalize_korean_text(event.summary)
    label = normalize_korean_text(event.timetable_label or summary)[:12]
    if summary == event.summary and label == (event.timetable_label or ""):
        return event
    data = event.model_dump()
    data["summary"] = summary
    data["timetable_label"] = label
    return ParsedScheduleEvent.model_validate(data)
