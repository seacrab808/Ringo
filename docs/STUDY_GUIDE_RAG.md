# 학습지 생성: Few-shot + RAG 설계

## 결론: Few-shot + RAG 추천

| 방식 | 역할 |
|------|------|
| **Few-shot** | 첨부한 `0304·0318·0401…` 학습지 **형식·톤·섹션 구성**을 모델에 보여 줌 |
| **RAG** | 이번 주 **강의 자료 PDF**에서 해당 주제 관련 문단만 골라 와서 **내용 환각**을 줄임 |
| **생성 LLM** | Ollama (`llama3.2` 등) — 구조화된 Markdown 학습지 출력 |

단순 요약만 하면 “교수님 슬라이드 나열”이 되기 쉽고, 단순 few-shot만 쓰면 강의 내용이 빠질 수 있습니다. **둘을 같이 쓰는 구성이 Ringo 목표(첨부 예시와 비슷한 학습지)에 가장 잘 맞습니다.**

## 파이프라인

```
[예시 학습지 PDF × N]  ──extract──►  few_shot/*.md  (저장소, 수동/스크립트 갱신)
                                              │
[강의 자료 PDF]  ──upload──►  chunk + (optional) embed  ──retrieve──► top-k chunks
                                              │
                                              ▼
                         Prompt = 시스템 규칙 + few-shot + RAG chunks + Task 메타
                                              │
                                              ▼
                                    Ollama → Markdown 학습지
                                              │
                                              ▼
                         Task 페이지에 표시 (+ 추후 요약 PDF export)
```

## 학습지 섹션 (예시 PDF 기준 — `samples/study-guides/` 참고)

1. **헤더** — 주차·날짜·주제·한 줄 목표  
2. **핵심 개념** — 불릿, 용어 정의  
3. **수식·정의** — LaTeX 가능 (`$...$`)  
4. **직관 / 그림 설명** — “왜 이렇게?”  
5. **예제·연습** — 풀이 스케치  
6. **체크리스트** — 시험 전 확인  

Few-shot 예시 2~3개면 충분합니다. 5개 전부 넣으면 컨텍스트가 커지므로 **가장 비슷한 2개만** 선택(주제 키워드 매칭)하는 것도 2단계에서 추가합니다.

## RAG 세부

- **추출**: PyMuPDF (`pymupdf`)  
- **청킹**: ~800자, 120자 overlap, 제목 줄은 메타데이터로 유지  
- **검색 (1단계)**: 키워드 overlap 점수 (한국어 형태소 없이도 동작)  
- **검색 (2단계)**: Ollama `nomic-embed-text` + 코사인 유사도 (pgvector)  

## API (1단계)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/v1/tasks/{id}/page` | 메모·첨부·학습지 조회 |
| `PATCH` | `/api/v1/tasks/{id}/page` | 메모 저장 |
| `POST` | `/api/v1/tasks/{id}/attachments` | PDF 업로드 |
| `POST` | `/api/v1/tasks/{id}/study-guide/generate` | RAG+few-shot 학습지 생성 |

## 예시 PDF 등록 방법

Windows에 있는 학습지를 Ringo에 넣으려면:

```bash
# 로컬(Windows/WSL)에서 PDF → few-shot Markdown
pip install pymupdf
python scripts/pdf_to_few_shot.py \
  "C:/Users/yuna/Desktop/.../0304 학습지.pdf" \
  --out backend/data/study_guide_examples/0304.md
```

`backend/data/study_guide_examples/` 아래 `.md` 파일이 자동으로 few-shot 풀에 들어갑니다.

## 노션형 Task 페이지

- 경로: `/tasks/[id]`  
- 탭: **메모** | **자료** | **학습지**  
- 플래너 Task 클릭 → 상세 페이지 (시트는 빠른 수정용 유지)  

## 이후 단계

- [ ] 요약 PDF export (WeasyPrint / reportlab)  
- [ ] Supabase Storage + `pgvector`  
- [ ] few-shot 자동 선택 (주제 임베딩 유사도)  
- [ ] 강의 자료가 슬라이드 여러 장일 때 주차별 Task 연결  
