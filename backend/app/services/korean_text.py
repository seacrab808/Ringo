from __future__ import annotations

import re
import unicodedata

from app.services.korean_schedule import normalize_korean_text

_STUDY_GUIDE_NOISE = re.compile(
    r"학습지|요약|정리|만들어\s*줘|만들어줘|첨부|강의\s*자료|교안|슬라이드|"
    r"pdf|ppt|해\s*줘|해줘|부탁|작성|생성",
    re.IGNORECASE,
)

_TIME_DATE_NOISE = re.compile(
    r"(이번\s*주|이번주|내일|모레|오늘|다음\s*주|차주|"
    r"[월화수목금토일]요일|오전|오후|"
    r"\d+\s*시(?:\s*\d+\s*분)?(?:\s*부터|\s*까지)?|"
    r"\d{1,2}:\d{2}|부터|까지|에\s*있|있어요?|있음|있다|합니다)",
    re.IGNORECASE,
)

_TITLE_PATTERNS = (
    re.compile(
        r"([\uac00-\ud7a3A-Za-z0-9][\uac00-\ud7a3A-Za-z0-9·\s]{1,40}?"
        r"(?:수업|강의|세미나|미팅|회의|조교|랩미팅|발표|시험|과제|튜터링|청강))",
    ),
    re.compile(
        r"([\uac00-\ud7a3]{2,20}\s*[\uac00-\ud7a3]{1,15})",
    ),
)


def hangul_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha() or "\uac00" <= c <= "\ud7a3"]
    if not letters:
        return 0.0
    hangul = sum(1 for c in letters if "\uac00" <= c <= "\ud7a3")
    return hangul / len(letters)


def is_garbled_korean(text: str) -> bool:
    """Detect model/PDF-extraction garbage masquerading as a title."""
    if not text or len(text.strip()) < 2:
        return True
    s = text.strip()
    if hangul_ratio(s) < 0.45 and not s.isascii():
        return True
    # Repeated syllables / broken endings
    if re.search(r"(세요){2,}|(휵|넝|센){2,}", s):
        return True
    if re.search(r"(.)\1{4,}", s):
        return True
    # Too few distinct syllables for length
    syllables = [c for c in s if "\uac00" <= c <= "\ud7a3"]
    if len(syllables) >= 6 and len(set(syllables)) <= 3:
        return True
    # High ratio of rare jamo clusters without spaces in long strings
    if len(s) > 12 and " " not in s and hangul_ratio(s) < 0.7:
        return True
    return False


def extract_schedule_title_from_user(user_text: str) -> str:
    """Best-effort Korean event title from the user's own message."""
    text = normalize_korean_text(user_text.strip())
    if not text:
        return ""

    scrubbed = _STUDY_GUIDE_NOISE.sub(" ", text)
    scrubbed = _TIME_DATE_NOISE.sub(" ", scrubbed)
    scrubbed = re.sub(r"\s+", " ", scrubbed).strip(" .,·()[]")

    for pat in _TITLE_PATTERNS:
        m = pat.search(scrubbed)
        if m:
            candidate = normalize_korean_text(m.group(1).strip())
            if candidate and not is_garbled_korean(candidate):
                return candidate[:80]

    # Last resort: longest hangul phrase (≥2 chars)
    phrases = re.findall(r"[\uac00-\ud7a3]{2,25}", scrubbed)
    phrases.sort(key=len, reverse=True)
    for p in phrases:
        if not is_garbled_korean(p) and p not in ("오늘", "내일", "이번주"):
            return p[:80]
    return scrubbed[:80] if scrubbed and not is_garbled_korean(scrubbed) else ""


def repair_summary(summary: str, user_text: str, *, fallback: str = "") -> str:
    cleaned = normalize_korean_text(summary or "")
    if cleaned and not is_garbled_korean(cleaned):
        return cleaned
    from_user = extract_schedule_title_from_user(user_text)
    if from_user:
        return from_user
    if fallback and not is_garbled_korean(fallback):
        return normalize_korean_text(fallback)
    return cleaned or "새 일정"
