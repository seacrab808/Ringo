from app.config import Settings
from app.services.study_guide_prompt import (
    build_study_guide_system_prompt,
    build_study_guide_user_prompt,
)


def test_user_prompt_includes_sections():
    settings = Settings(
        study_guide_student_profile="서강대학교 대학원 석사",
        study_guide_course_name="고성능 딥러닝",
    )
    prompt = build_study_guide_user_prompt(
        settings=settings,
        task_title="딥러닝 수업",
        lecture_topic="7주차 RAG",
        extra_instructions=None,
        few_shot_block="",
        rag_block="[chunk 0]\nRAG 내용",
    )
    assert "핵심 요약" in prompt or "로드맵" in prompt
    assert "대단원" in prompt
    assert "수식" in prompt
    assert "HTML" in prompt
    assert "20페이지" in prompt or "20페이지 이상" in prompt
    assert "수식" in prompt
    assert "딥러닝 수업" in prompt
    assert "RAG 내용" in prompt


def test_system_prompt_requires_html():
    system = build_study_guide_system_prompt()
    assert "HTML" in system
    assert "한국어" in system
