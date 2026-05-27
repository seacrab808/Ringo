# Supabase 설정 (Ringo 3단계)

## 1. 프로젝트 생성

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. **SQL Editor** → `supabase/migrations/20260527000000_initial.sql` 내용 실행  
   (또는 CLI: `supabase db push`)

## 2. 백엔드 환경 변수

`backend/.env`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings → API → service_role (비공개)
```

- **service_role** 키는 FastAPI 서버에만 둡니다. 프론트에 넣지 마세요.
- 비워 두면 API는 `database: disabled`이고, 프론트는 localStorage만 사용합니다.

## 3. API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/tasks?from=&to=` | 기간 내 Task 목록 |
| POST | `/api/v1/tasks` | Task 생성 |
| PATCH | `/api/v1/tasks/{id}` | Task 수정 |
| DELETE | `/api/v1/tasks/{id}` | Task 삭제 |
| PUT | `/api/v1/tasks/reorder` | 하루 Task `list_order` 일괄 갱신 |
| GET | `/api/v1/diaries?from=&to=` | 일기 목록 |
| PUT | `/api/v1/diaries/{date}` | 일기 upsert |
| GET | `/api/v1/timetable/{date}` | 06:00~익일 05:00 블록 (24칸) |

`GET /health` → `database: connected | disabled`

## 4. 프론트

`NEXT_PUBLIC_USE_RINGO_DB=true` 이면 hydrate 시 API에서 Task·일기를 불러옵니다.  
변경 시 자동으로 API에 반영됩니다 (localStorage는 오프라인 캐시).

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
NEXT_PUBLIC_USE_RINGO_DB=true
```

## 5. 로컬 Supabase (선택)

```bash
npx supabase init
npx supabase start
```

로컬 URL·키를 `.env`에 맞게 설정합니다.
