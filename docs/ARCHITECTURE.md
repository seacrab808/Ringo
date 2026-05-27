# Ringo 아키텍처 청사진

## 시스템 개요

```
[Browser: Next.js PWA]
        │  REST / (추후 SSE)
        ▼
[FastAPI Backend] ──async──► [Ollama :11434]  (로컬 LLM)
        │
        ├──► [Supabase PostgreSQL]  tasks, habits, diaries
        ├──► [Supabase Storage]     PDF 교안
        └──► [Supabase pgvector]    RAG 임베딩 (5단계)
```

단일 사용자 대시보드 — 복잡한 OAuth 대신 API 키 또는 내부 네트워크 신뢰 모델.

## 메인 UI: 모트모트형 **하루 한 페이지** (일기 별도 날짜 화면 아님)

하루 단위 플래너 한 장. 일기는 **같은 페이지 맨 아래** 블록.

```
┌─────────────────────────────────────────────────────────────┐
│  DATE · D-day · 오늘 총 시간 · 수면/기상 (선택)              │
├──────────────────────┬──────────────────────────────────────┤
│  TASK (드래그 정렬)   │  TIMETABLE (시간축 + 색 블록)          │
│  · 시간 있음 → 위쪽   │  · Task와 1:1 연동                   │
│  · 시간 없음 → 아래   │  · 카테고리별 파스텔 하이라이트       │
│  · 카테고리 라벨      │  · 예: 14–15시 회색/파랑 + 제목       │
├──────────────────────┴──────────────────────────────────────┤
│  오늘의 일기 / 한 줄 회고 (모트모트 하단 메모란 확장)          │
└─────────────────────────────────────────────────────────────┘
        ▲ Ringo 채팅(자연어 등록)은 PC에서는 좌측 패널 또는 플로팅
```

- Task 클릭 → 노션형 **하위 페이지**(메모, 첨부, AI 요약/PDF)  
- 습관 트래커는 **별도 패널/탭**(일·주·월) — 플래너 본문과 분리

## 캘린더 전략: Ringo 자체 + (선택) Google Calendar

| 계층 | 역할 |
|------|------|
| **Ringo DB** | 소스 오브 트루스 — Task, 타임블록, 반복, 일기, 습관 |
| **Google Calendar API** | (추후, 선택) 읽기/쓰기 동기화 — 이미 외부에 넣은 일정 가져오기·밀어넣기 |

> 1단계 백엔드는 **GCal 연동 코드 없음**. 이벤트 필드명만 iCal/GCal과 비슷한 **내부 JSON 형태**로 파싱함.

## 데이터 흐름: 자연어 일정 등록

1. 사용자가 채팅창에 문장 입력  
2. `POST /api/v1/parse/schedule` → Ollama가 구조화 JSON 반환  
3. 프론트가 `sort_tasks()` 규칙으로 Tasks 리스트 갱신  
4. (2단계+) 사용자 확인 후 **Ringo DB(Supabase)**에 persist  
5. 같은 날 TASK ↔ TIMETABLE 블록 자동 반영  

## Task 정렬 규칙

1. `is_time_fixed == true` → `start` 시각 오름차순 (상단)  
2. `is_time_fixed == false` → `created_order` 또는 등록 순서 유지 (하단)  

## 제품 스펙 · 인증

- 상세 요구사항: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)
- 1인 4기기 접근: [AUTH.md](./AUTH.md)

## 카테고리 (타임테이블 색)

사용자 생성 무제한. 기본 slug 예: `class`, `ta`, `research`, `health`, `outsourcing`, `meeting`, `personal`.

## 학기 반복 일정

`RecurrenceRule` + `semester_start` / `semester_end` 로 "매주 금요일 14:00" 패턴 표현.  
FullCalendar `rrule` 플러그인과 동기화 예정.

## 리소스 절약 원칙

- FastAPI + `httpx.AsyncClient` — 블로킹 I/O 없음  
- Ollama 요청 타임아웃·`num_predict` 제한  
- 백그라운드 리마인더/리포트는 별도 경량 워커 (APScheduler 또는 cron)  
- RAG는 PDF 업로드 시에만 임베딩 배치 처리  

## 보안 (개인 서버)

- `.env`에 Supabase service role — 서버만 보관  
- CORS는 프론트 오리진만 허용  
- (선택) `X-Ringo-Token` 헤더로 단일 사용자 게이트  
