# Ringo (링고) — 1인 맞춤형 AI 비서 & 데일리 플래너

귀여운 랫서팬더 마스코트 **Ringo**와 함께하는 개인용 데일리 플래너입니다.  
모트모트 스타일 UI, **로컬 Ollama** 자연어 파싱, **Supabase** 영속 저장을 지원합니다.

## 주요 기능 (현재)

| 기능 | 설명 |
|------|------|
| **채팅 등록** | 한국어로 일정 말하기 → Ollama 파싱 → **확인·수정 후 등록** |
| **플래너** | 하루 한 화면 — Task(드래그 정렬) + 타임테이블(색 연동) + 일기 |
| **캘린더** | 월간 보기, 날짜별 일정 개수, 클릭 시 플래너로 이동 |
| **타임테이블** | 06:00 ~ 익일 05:00, 24칸 (모트모트 축) |
| **저장** | localStorage(기본) 또는 Supabase(선택) |

### 화면

| 경로 | 설명 |
|------|------|
| `/planner` | 오늘 플래너 (채팅 패널 + Task + Timetable + 일기) |
| `/chat` | Ringo 전용 채팅 화면 |
| `/calendar` | 월간 캘린더 |

---

## 프로젝트 구조

```
Ringo/
├── README.md
├── docs/
│   ├── PRODUCT_SPEC.md    # 제품 스펙 (확정)
│   ├── ARCHITECTURE.md    # 시스템 청사진
│   ├── SUPABASE.md        # DB 마이그레이션 & API 연동
│   ├── AUTH.md            # 1인 접근 (토큰 등)
│   └── DEPLOY.md          # Vercel + 연구실 서버 배포
├── supabase/
│   └── migrations/        # PostgreSQL 스키마
├── scripts/
│   └── dev-backend.sh
├── frontend/                # Next.js 16 (App Router)
│   ├── src/app/             # /planner, /chat, /calendar
│   ├── src/components/
│   ├── src/hooks/           # use-ringo-store (상태 + 동기화)
│   └── .env.local.example
└── backend/                 # FastAPI
    ├── app/api/routes/      # parse, tasks, diaries, timetable, health
    ├── app/services/        # ollama_parser, timetable_blocks
    ├── app/repositories/    # Supabase CRUD
    └── .env.example
```

---

## 기술 스택

| 영역 | 스택 |
|------|------|
| Frontend | Next.js 16, React 19, Tailwind 4, shadcn/ui, `@hello-pangea/dnd`, date-fns |
| Backend | Python 3.10+, FastAPI, Pydantic v2, httpx |
| DB | Supabase (PostgreSQL) — service role은 **백엔드만** |
| AI | 로컬 Ollama (기본: `llama3.2:latest`) |

---

## 빠른 시작

### 1. Ollama

```bash
ollama pull llama3.2:latest   # 또는 ollama list 로 설치된 모델 사용
ollama serve
```

### 2. 백엔드

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # OLLAMA_MODEL, 포트 등 수정
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

- API 문서: http://127.0.0.1:8001/docs  
- 헬스체크: http://127.0.0.1:8001/health  
- Ollama 상태: http://127.0.0.1:8001/health/ollama  

> 포트 `8000`이 다른 서비스와 겹치면 `8001` 등으로 변경하세요.

### 3. 프론트엔드

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

→ http://localhost:3000/planner

`.env.local` 예시:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
# NEXT_PUBLIC_USE_RINGO_DB=true   # Supabase 연동 시
# localStorage에 ringo_token 저장 시 X-Ringo-Token 으로 전송
```

### 4. Supabase (선택 — 영속 저장)

1. Supabase 프로젝트 생성  
2. SQL Editor에서 `supabase/migrations/20260527000000_initial.sql` 실행  
3. `backend/.env`에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 설정  
4. `frontend/.env.local`에 `NEXT_PUBLIC_USE_RINGO_DB=true`  
5. `/health` 응답에서 `"database": "connected"` 확인  

상세: [docs/SUPABASE.md](docs/SUPABASE.md)

---

## API 요약

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/v1/parse/schedule` | 자연어 → 구조화 일정 JSON |
| `GET` | `/api/v1/tasks?from=&to=` | Task 목록 |
| `POST` | `/api/v1/tasks` | Task 생성 |
| `PATCH` | `/api/v1/tasks/{id}` | Task 수정 |
| `DELETE` | `/api/v1/tasks/{id}` | Task 삭제 |
| `PUT` | `/api/v1/tasks/reorder` | 하루 Task 순서 |
| `GET` | `/api/v1/diaries?from=&to=` | 일기 목록 |
| `PUT` | `/api/v1/diaries/{date}` | 일기 upsert |
| `GET` | `/api/v1/timetable/{date}` | 24h 타임블록 |
| `GET` | `/health` | 서버·DB 상태 |

선택: 백엔드 `RINGO_API_TOKEN` 설정 시 요청 헤더 `X-Ringo-Token` 필요 ([docs/AUTH.md](docs/AUTH.md)).

---

## 채팅 → 등록 흐름

1. 사용자가 자연어 입력 (예: 「이번주 금요일 오후 2시에 딥러닝 수업 있어」)  
2. `POST /api/v1/parse/schedule` → Ollama JSON 파싱  
3. **확인 카드**에서 제목·날짜·시간·카테고리 수정  
4. **등록하기** → Task 반영 (+ Supabase 사용 시 DB 저장)  
5. 해당 날짜 플래너·타임테이블에 즉시 표시  

---

## 배포

- **프론트**: Vercel, Root Directory = `frontend`, `NEXT_PUBLIC_API_URL` = 연구실 FastAPI HTTPS URL  
- **백엔드·Ollama**: 연구실 서버 24h (systemd 등)  

[docs/DEPLOY.md](docs/DEPLOY.md)

---

## 로드맵

| 단계 | 내용 | 상태 |
|------|------|------|
| 1 | FastAPI + Ollama 자연어 파싱, Pydantic 스키마 | ✅ |
| 2 | Next.js 플래너, 채팅, 확인 후 등록, Task DnD, 타임테이블 | ✅ |
| 3 | Supabase 스키마, CRUD, 24h 타임테이블 API | ✅ |
| 4 | 학기 반복 일정, 카테고리 커스터마이즈 | |
| 5 | 노션형 Task 페이지, PDF RAG·요약 | |
| 6 | 습관 트래커, GitHub 커밋 연동 | |
| 7 | 야간 리마인더, 주/월 AI 리포트 | |

제품 상세: [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)

---

## 개발

```bash
# 백엔드 테스트
cd backend && source .venv/bin/activate && PYTHONPATH=. pytest -q

# 프론트 빌드
cd frontend && npm run build
```

---

## 라이선스

개인 토이 프로젝트 — 비공개 사용 권장.
