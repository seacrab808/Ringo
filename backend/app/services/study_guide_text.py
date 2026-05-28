from __future__ import annotations

import re

_STUDY_GUIDE_HINTS = re.compile(
    r"학습지|요약해|정리해|핵심.?정리|복습.?자료|study\s*guide|만들어\s*줘|만들어줘",
    re.IGNORECASE,
)

_HEADER_FIX = re.compile(r"^#{1,6}\s*#+\s*", re.MULTILINE)


def derive_study_titles(
    user_text: str,
    *,
    parsed_summary: str | None = None,
) -> tuple[str, str | None]:
    """Returns (task_title, lecture_topic)."""
    if parsed_summary and parsed_summary.strip():
        title = parsed_summary.strip()
        return title, user_text.strip() or None
    cleaned = _STUDY_GUIDE_HINTS.sub(" ", user_text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .,·")
    title = cleaned[:80] if cleaned else "학습지"
    return title, user_text.strip() or None


def is_html_study_guide(text: str) -> bool:
    if not text:
        return False
    lower = text.lstrip().lower()
    return lower.startswith("<!doctype") or lower.startswith("<html") or "<article" in lower[:800]


def sanitize_study_guide_output(text: str) -> str:
    if not text:
        return text
    out = text.strip()
    # Strip markdown code fences wrapping HTML
    fence = re.match(r"^```(?:html)?\s*\n([\s\S]*?)\n```\s*$", out, re.IGNORECASE)
    if fence:
        out = fence.group(1).strip()
    out = re.sub(r"<script[\s\S]*?</script>", "", out, flags=re.IGNORECASE)
    out = out.replace("\r\n", "\n")
    if is_html_study_guide(out):
        return out
    out = _HEADER_FIX.sub("## ", out)
    out = re.sub(r"^#{4,}\s*", "## ", out, flags=re.MULTILINE)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def sanitize_study_guide_markdown(text: str) -> str:
    """Backward-compatible alias."""
    return sanitize_study_guide_output(text)
