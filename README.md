# Ringo (링고) — 1인 맞춤형 AI 비서 & 데일리 플래너

귀여운 랫서팬더 마스코트 **Ringo**와 함께하는 개인 서버용 데일리 플래너입니다.  
토스처럼 깔끔하고 몽글몽글한 UI, 로컬 Ollama + Supabase 기반의 가벼운 24시간 구동을 목표로 합니다.

## 프로젝트 구조

```
Ringo/
├── README.md
├── .gitignore
├── docker-compose.yml          # (2단계+) 프론트/백/ollama 오케스트레이션
├── docs/
│   └── ARCHITECTURE.md         # 전체 청사진 & 로드맵
├── scripts/
│   └── dev-backend.sh          # 백엔드 개발 서버 실행
├── frontend/                   # Next.js (App Router) + Tailwind + shadcn
│   ├── public/assets/          # ringo-mascot.png 등
│   ├── src/
│   │   ├── app/                # 라우트, 레이아웃
│   │   ├── components/         # UI, FullCalendar, DnD Tasks
│   │   ├── lib/                # API 클라이언트, 유틸
│   │   └── types/              # TS 타입 (백엔드 스키마 미러)
│   └── package.json            # (2단계에서 초기화)
└── backend/                    # FastAPI (async)
    ├── requirements.txt
    ├── .env.example
    └── app/
        ├── main.py             # 앱 엔트리
        ├── config.py           # 환경 설정
        ├── api/routes/         # HTTP 라우트
        ├── schemas/            # Pydantic (Google Calendar 스타일)
        ├── services/           # Ollama 파서, 정렬, (추후 RAG)
        └── core/               # 공통 예외, 의존성
```

## 기술 스택

| 영역 | 스택 |
|------|------|
| Frontend | Next.js (App Router), Tailwind, shadcn/ui, FullCalendar, @hello-pangea/dnd |
| Backend | Python FastAPI (async) |
| DB / Storage | Supabase (PostgreSQL, Vector, Storage) |
| AI | 로컬 Ollama (Qwen2.5-14B-Instruct / Llama-3-8B-Instruct) |

## 1단계 (현재): 자연어 → 일정 JSON 파싱

`POST /api/v1/parse/schedule` — 한국어 자연어를 Google Calendar 스타일 JSON으로 변환합니다.

### 백엔드 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Ollama URL·모델명 수정
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API 문서: http://localhost:8000/docs  
- 헬스체크: http://localhost:8000/health  

### Ollama 사전 준비

```bash
ollama pull qwen2.5:14b-instruct   # 또는 llama3:8b-instruct
ollama serve
```

## 로드맵

| 단계 | 내용 |
|------|------|
| **1** ✅ | FastAPI + Ollama 자연어 파싱, Pydantic 스키마, Task 정렬 |
| 2 | Next.js 대시보드 레이아웃, 채팅 UI, Tasks DnD |
| 3 | Supabase 스키마, CRUD, 24h 타임테이블 |
| 4 | 학기 반복 일정, 카테고리 하이라이트 |
| 5 | 노션형 하위 페이지, PDF RAG |
| 6 | 습관 트래커, GitHub 연동, 일기 |
| 7 | 야간 리마인더, 주/월 리포트 (스케줄러) |

## 라이선스

개인 토이 프로젝트 — 비공개 사용 권장.
