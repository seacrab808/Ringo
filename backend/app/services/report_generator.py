from __future__ import annotations

import logging
from datetime import date

import httpx

from app.config import Settings, get_settings
from app.services.report_collector import ReportCollectedData
from app.services.report_period import period_title

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """당신은 Ringo라는 1인 데일리 플래너 AI 비서입니다.
사용자의 주간/월간 활동 데이터를 바탕으로 따뜻하고 구체적인 한국어 리포트를 작성합니다.

규칙:
- 마크다운 형식 (제목 ##, 목록 -, 굵게 **)
- 800~1500자 내외
- 반드시 포함: (1) 한 줄 요약 (2) 잘한 점 (3) 개선·다음 주/달 제안 (4) 습관·일기 코멘트
- 수치는 제공된 데이터만 사용 (추측 금지)
- 격려하는 톤, 존댓말
- 이모지는 섹션당 0~1개만 가볍게 사용
"""


class ReportGenerator:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @property
    def model(self) -> str:
        return self.settings.report_model

    async def generate(
        self,
        *,
        period: str,
        anchor: date,
        data: ReportCollectedData,
        client: httpx.AsyncClient | None = None,
    ) -> tuple[str, str]:
        title = period_title(period, data.start, data.end)
        user_prompt = f"""다음은 사용자의 {title} 원본 데이터입니다.

{data.context_text}

---

위 데이터만 근거로 「{title}」 AI 리포트를 작성해 주세요.
첫 줄에 # 제목을 넣고, 그 다음부터 본문을 작성하세요."""

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "options": {
                "num_predict": self.settings.ollama_report_num_predict,
                "temperature": self.settings.ollama_report_temperature,
            },
            "keep_alive": self.settings.ollama_keep_alive,
        }
        url = f"{self.settings.ollama_base_url.rstrip('/')}/api/chat"
        timeout = httpx.Timeout(
            connect=self.settings.ollama_connect_timeout_seconds,
            read=self.settings.ollama_report_timeout_seconds,
            write=30.0,
            pool=5.0,
        )
        own = client is None
        if own:
            client = httpx.AsyncClient(timeout=timeout)
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            body = resp.json()
            msg = body.get("message") or {}
            text = (msg.get("content") or body.get("response") or "").strip()
            if not text:
                raise ValueError("Empty report from Ollama")
            return text, self.model
        except httpx.HTTPStatusError as exc:
            logger.warning("Report Ollama HTTP %s", exc.response.status_code)
            raise
        finally:
            if own and client:
                await client.aclose()
