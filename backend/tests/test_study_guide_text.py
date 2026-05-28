from app.services.study_guide_text import (
    derive_study_titles,
    is_html_study_guide,
    sanitize_study_guide_output,
)


def test_derive_study_titles_from_parse():
    title, topic = derive_study_titles(
        "오늘 4시반 딥러닝 수업 학습지 만들어줘",
        parsed_summary="딥러닝 수업",
    )
    assert title == "딥러닝 수업"
    assert "딥러닝" in (topic or "")


def test_sanitize_headers():
    raw = "#### # 학습 목표\n- 항목"
    out = sanitize_study_guide_output(raw)
    assert "#### #" not in out
    assert "학습 목표" in out


def test_html_fence_strip():
    raw = "```html\n<html><body><p>ok</p></body></html>\n```"
    out = sanitize_study_guide_output(raw)
    assert is_html_study_guide(out)
    assert "```" not in out
