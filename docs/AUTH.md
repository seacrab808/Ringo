# Ringo 접근 제어 (1인 · 4기기)

집 PC, 연구실 PC, 노트북, 휴대폰에서 **같은 24시간 서버**를 쓰는 전제.

## 권장: 지금은 풀 로그인 없이 “비밀번호 1개 + HTTPS”

OAuth/회원가입은 1인 토이에 과합니다. 대신:

```
[브라우저] ──HTTPS──► [Nginx/Caddy] ──► [Next.js + FastAPI]
              │              │
              │              └── 선택: Basic Auth 또는 앱 단일 비밀번호
              └── Tailscale / Cloudflare Tunnel (집 밖에서도 안전)
```

### 옵션 A — **앱 단일 비밀번호** (추천)

1. 서버 `.env`에 `RINGO_APP_PASSWORD=긴랜덤문자열`
2. 첫 방문 시 브라우저에 비밀번호 입력 → `httpOnly` 쿠키 또는 `localStorage` + `X-Ringo-Token`
3. FastAPI에 이미 있는 `X-Ringo-Token`과 동일 값 사용
4. 4기기 모두 **같은 비밀번호** — 기기마다 한 번만 입력

**장점:** 구현 빠름, Supabase Auth 불필요  
**단점:** 비밀번호 유출 시 전체 노출 → HTTPS + 긴 토큰 필수

### 옵션 B — **리버스 프록시 Basic Auth**

- Caddy/Nginx에서 `ringo.yourdomain` 접근 시 ID/비밀번호
- 앱 코드는 인증 없음

**장점:** 앱 수정 최소  
**단점:** 모바일에서 매번 물어볼 수 있음 (브라우저 저장으로 완화)

### 옵션 C — **Tailscale만** (가장 단순)

- 서버·4기기 Tailscale 가입 → `http://100.x.x.x:3000` 으로만 접속
- 공인 인터넷에 포트 안 열어도 됨

**장점:** 로그인 코드 0  
**단점:** Tailscale 설치 필요, 외부인 공유 불가

---

## 나중에 로그인을 넣을 때

- Supabase Auth **이메일 매직링크 1계정** 정도면 충분
- “4기기”는 **세션 쿠키**로 자동 해결 — 기기 수 제한 불필요

## 지금 결론

| 항목 | 결정 |
|------|------|
| 회원가입/OAuth | **하지 않음** (MVP) |
| 최소 보안 | **HTTPS 공개 URL** + 웹 로그인 1회 → 쿠키 |
| 4기기 | `https://ringo.도메인` 동일 — 기기마다 로그인 **최초 1번** |

서버 “안쪽 IP”나 SSH 터널로 들어가는 방식은 쓰지 않습니다.  
→ 배포 절차는 [DEPLOY.md](./DEPLOY.md) 참고.

구현 순서: **2단계 프론트**에 `/login` 페이지 + `httpOnly` 쿠키.
