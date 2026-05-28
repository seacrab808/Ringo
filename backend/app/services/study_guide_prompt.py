from __future__ import annotations

from app.config import Settings

# Reference quality: 「CME 295 Transformers·LLM 상세 학습 가이드」,
# 「Position Embeddings·Layer Normalization 수식 정리 학습 자료」 수준
STUDY_GUIDE_QUALITY_ANCHOR = """
목표 품질 (반드시 맞출 것):
- 대학원 딥러닝 **상세 학습 가이드** + **수식 정리 학습 자료**를 합친 수준의 길이·깊이
- 짧은 요약·개요만 있는 문서는 **실패**로 간주한다
- A4 인쇄 **최소 20페이지 이상** (여백 포함). 보통 25~40페이지 분량을 목표로 한다
"""


def build_study_guide_system_prompt() -> str:
    return f"""당신은 서강대학교 대학원 딥러닝·NLP 전공 석사를 위한 **상세 학습지** 전문 저자입니다.
{STUDY_GUIDE_QUALITY_ANCHOR}

출력 규칙:
- 반드시 한국어 (기술 용어·수식 기호는 영어/LaTeX 병기).
- 베트남어·중국어·일본어 문장 금지.
- RAG 발췌에 없는 사실은 추측하지 않는다. 페이지 번호는 근거 있을 때만.
- 출력: **완전한 HTML 문서** 하나만 (`<!DOCTYPE html>` ~ `</html>`).
- Markdown 금지. HTML/CSS/SVG·표·카드·수식 블록을 풍부하게 사용.
- 수식은 `<pre><code>` 에 단계별 유도 포함 (정의 → 전개 → 최종식).
- CSS 클래스: `.sg-section`, `.sg-section-title`, `.sg-card`, `.sg-card-muted`,
  `.sg-highlight`, `.sg-page-ref`, `.sg-term-card`, `.sg-term-name`, `.sg-diagram`,
  `.sg-table`, `.sg-flow`, `.sg-flow-step`
- `<script>` 금지.

분량·밀도 규칙:
- RAG chunk 1개당 **최소 1개의 큰 `sg-section`** (800자+ 설명, 수식 1+, 용어카드 2+).
- 문서 전체 **용어 카드 12개 이상**, **비교표 3개 이상**, **SVG/CSS 도식 5개 이상**.
- 각 주요 개념: 동기 → 정의 → 수식유도 → 직관 → 예제 → 흔한 오류 → 체크포인트 순서.
"""


def build_study_guide_user_prompt(
    *,
    settings: Settings,
    task_title: str,
    lecture_topic: str | None,
    extra_instructions: str | None,
    few_shot_block: str,
    rag_block: str,
    rag_chunk_count: int = 0,
) -> str:
    course = settings.study_guide_course_name.strip() or task_title
    profile = settings.study_guide_student_profile.strip()
    topic = lecture_topic or task_title
    min_sections = max(6, rag_chunk_count, settings.study_guide_min_sections)

    parts = [
        f"""{profile}
수업: {course}
첨부 강의 자료(PDF/PPT)로 시험 대비 **상세 학습지**를 작성한다.

제목 형식: 「{{주제}} 상세 학습 가이드」 (필요 시 부제: 수식 정리·개념 추적)

## 1. 문서 골격 (필수)

### A. 서론 `sg-section`
- 📋 핵심 요약 + 학습 로드맵 (번호 목차 8줄 이상)
- 선수 지식, 이번 자료 범위, 시험에 나올 포인트

### B. 본문 — **자료 순서대로** {min_sections}개 이상의 대단원 `sg-section`
각 대단원마다 **아래 8블록을 빠짐없이** (짧게 쓰지 말 것):
1. `sg-page-ref` — 자료 파일명·페이지
2. **왜 배우나** — `.sg-highlight` (동기·역사·한계)
3. **핵심 정의** — `.sg-card` 2~3개
4. **수식·유도** — `<pre><code>` 단계별 (변수 표 `.sg-table` 포함)
5. **직관·비유** — `.sg-card-muted`
6. **도식** — `.sg-diagram` (Attention/Block/Embedding 등 SVG 또는 CSS)
7. **핵심 용어** — 등장 용어마다 `.sg-term-card` (쉬운 예시·헷갈림)
8. **예제·연습** — 숫자 풀이 또는 pseudo-code `.sg-card`

※ Position Embedding / Layer Norm / Attention 같이 수식 중심 주제는
「수식 정리 학습 자료」처럼 **유도 과정을 특히 길게** (1.5페이지 이상/절).

### C. 결론 `sg-section` 🎯
- 기술·개념 **인과관계** `.sg-flow` (등장 이유 → 한계 → 다음 기술)
- 비교표 `.sg-table` (방법 3종 이상 비교)
- 시험 체크리스트 (15항목 이상)
- 오개념 정리

## 2. 디자인
- 화이트 + 블루/그린, 카드형, 14px, A4 인쇄 여백
- 섹션 제목에 이모지

### 이번 생성
- 수업/일정: {task_title}
- 주제: {topic}
- RAG 발췌 청크 수: {rag_chunk_count} → **각 청크를 별도 대단원으로** 다룰 것
""",
    ]

    if extra_instructions:
        parts.append(f"\n### 추가 지시\n{extra_instructions}\n")

    if few_shot_block:
        parts.append(
            "\n### 참고 예시 (분량·깊이·수식 밀도 — HTML 구조는 위 지시 따름)\n"
            + few_shot_block
        )

    if rag_block:
        parts.append(
            "\n### 강의 자료 발췌 (RAG — 유일한 사실 근거. **모든 청크를 빠짐없이** 반영)\n"
            + rag_block
        )

    parts.append(
        f"\n위 지시대로 **단일 HTML**을 출력한다. "
        f"최소 {min_sections}개 대단원, A4 **20페이지 이상** 분량. "
        "학생이 이 문서만으로 시험·과제에 대비할 수 있을 만큼 길고 쉽게.\n"
    )
    return "\n".join(parts)
