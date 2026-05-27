# Ringo 배포 가이드 (1인 · 4기기)

서버 안쪽 IP나 SSH 터널 없이, **폰·노트북에서 URL 하나**로 쓰는 구성입니다.

## 목표

| 하지 않을 것 | 할 것 |
|-------------|--------|
| 매번 서버 내부 주소 + 별도 비밀번호 | `https://ringo.내도메인.com` 한 주소 |
| SSH로 터널 뚫기 | 브라우저 **첫 접속 1회 로그인** → 쿠키 유지 |
| 복잡한 회원가입 | 앱 비밀번호 1개 (또는 나중에 매직링크) |

## 권장 구조

```
[집/연구실/폰/노트북]
        │ HTTPS
        ▼
[Caddy 또는 Nginx]  :443  ← Let's Encrypt 인증서
        │
        ├── /        → Next.js (3000)
        └── /api     → FastAPI (8000)
```

또는 포트 개방이 어렵면:

```
[Cloudflare Tunnel] → ringo.example.com → localhost:3000/8000
```

공인 IP `163.239.27.193` 서버에 이미 올라가 있으므로, **도메인 A레코드** 또는 **Cloudflare Tunnel** 중 하나만 고르면 됩니다.

---

## 1. Node.js (완료)

시스템 전역이 아니라 **nvm**으로 설치됨:

```bash
source ~/.nvm/nvm.sh
node -v   # v24.x LTS
npm -v
```

새 터미널에서도 쓰려면 `~/.bashrc`에 nvm 로드가 들어가 있음 (이미 설정됨).

---

## 2. 앱 비밀번호 (U — 웹에서 1번만)

1. 서버 `.env`에 긴 랜덤 문자열:
   ```bash
   RINGO_API_TOKEN=여기에_32자이상_랜덤
   RINGO_APP_PASSWORD=같은값_또는_별도
   ```
2. Next.js **로그인 페이지** (`/login`): 비밀번호 입력 → `httpOnly` 쿠키 저장
3. 이후 API는 쿠키/헤더로 토큰 전달 — **4기기 각각 최초 1회만** 입력

SSH 비밀번호·서버 “안쪽” 주소와는 무관합니다.

---

## 3. Caddy로 HTTPS (도메인 있을 때)

`/etc/caddy/Caddyfile` 예시 (sudo 필요):

```caddy
ringo.yourdomain.com {
    reverse_proxy /api/* localhost:8000
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

---

## 4. Cloudflare Tunnel (도메인·방화벽 귀찮을 때)

```bash
# cloudflared 설치 후
cloudflared tunnel create ringo
cloudflared tunnel route dns ringo ringo.yourdomain.com
cloudflared tunnel run --url http://localhost:3000 ringo
```

443 포트를 직접 열지 않아도 됩니다.

---

## 5. 24시간 구동 (systemd)

`scripts/ringo-backend.service` / `ringo-frontend.service` 예시는 2단계 프론트 생성 후 추가.

```bash
sudo systemctl enable --now ringo-backend ringo-frontend
```

---

## 6. 지금 당장 할 일 체크리스트

- [x] Node.js (nvm + LTS)
- [ ] 도메인 또는 Cloudflare Tunnel 결정
- [ ] HTTPS 리버스 프록시
- [ ] `.env` 토큰 + `/login` UI (2단계 프론트와 함께)
- [ ] systemd로 백엔드·프론트 상시 실행

---

## 보안 참고

- Supabase **service role key**는 서버에만
- Ollama는 `127.0.0.1`만 바인딩 (외부 노출 X)
- HTTPS 없이 공인 IP만 쓰지 말 것 (비밀번호·토큰 탈취 위험)
