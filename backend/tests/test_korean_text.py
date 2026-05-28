from app.services.korean_text import (
    extract_schedule_title_from_user,
    is_garbled_korean,
    repair_summary,
)


def test_garbled_summary_detected():
    assert is_garbled_korean("휵넝세 안세요세요")
    assert not is_garbled_korean("딥러닝 수업")


def test_extract_title_from_user_message():
    title = extract_schedule_title_from_user(
        "오늘 오후 4시반 딥러닝 수업 있어. 첨부한 강의자료로 학습지 만들어줘",
    )
    assert "딥러닝" in title


def test_repair_summary_prefers_user_text():
    fixed = repair_summary(
        "휵넝세 안세요세요",
        "이번주 금요일 2시 딥러닝 수업",
        fallback="7주차",
    )
    assert "딥러닝" in fixed or fixed == "7주차"
