from __future__ import annotations

import logging
from datetime import date, datetime
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import get_settings
from app.core.deps import verify_api_token
from app.schemas.report import ReportGenerateRequest, ReportOut, ReportPeriod
from app.services.report_collector import collect_report_data
from app.services.report_generator import ReportGenerator
from app.services.report_period import period_range, period_title
from app.services.report_store import ReportStore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])
KST = ZoneInfo("Asia/Seoul")


def _anchor(anchor_date: date | None) -> date:
    if anchor_date is not None:
        return anchor_date
    return datetime.now(KST).date()


@router.get("", response_model=ReportOut)
def get_cached_report(
    period: ReportPeriod = Query(default=ReportPeriod.WEEK),
    anchor_date: date | None = None,
    _: None = Depends(verify_api_token),
) -> ReportOut:
    anchor = _anchor(anchor_date)
    start, end = period_range(period.value, anchor)
    store = ReportStore()
    cached = store.load(period.value, start, end)
    if not cached:
        raise HTTPException(status_code=404, detail="저장된 리포트가 없습니다. 생성을 요청해 주세요.")
    return cached


@router.post("/generate", response_model=ReportOut)
async def generate_report(
    body: ReportGenerateRequest,
    _: None = Depends(verify_api_token),
) -> ReportOut:
    settings = get_settings()
    anchor = _anchor(body.anchor_date)
    period = body.period.value
    start, end = period_range(period, anchor)
    title = period_title(period, start, end)

    store = ReportStore()
    if not body.refresh:
        cached = store.load(period, start, end)
        if cached and not cached.error:
            return cached

    collected = collect_report_data(
        period=period,
        start=start,
        end=end,
        anchor=anchor,
        client_context=body.client_context,
        settings=settings,
    )

    generator = ReportGenerator(settings)
    try:
        markdown, model = await generator.generate(
            period=period,
            anchor=anchor,
            data=collected,
        )
        error = None
    except httpx.HTTPError as exc:
        logger.warning("Report generation failed: %s", exc)
        markdown = _fallback_markdown(title, collected)
        model = generator.model
        error = "Ollama 리포트 생성에 실패해 통계 요약만 표시합니다. Ollama 실행·모델 설정을 확인해 주세요."
    except Exception as exc:
        logger.warning("Report generation error: %s", exc)
        markdown = _fallback_markdown(title, collected)
        model = generator.model
        error = f"리포트 생성 오류: {exc}"

    report = ReportOut(
        period=body.period,
        anchor_date=anchor.isoformat(),
        start_date=start.isoformat(),
        end_date=end.isoformat(),
        title=title,
        markdown=markdown,
        summary_stats=collected.stats,
        model=model,
        generated_at=datetime.now(KST),
        cached=False,
        error=error,
    )
    store.save(report)
    return report


def _fallback_markdown(title: str, collected) -> str:
    s = collected.stats
    return f"""# {title}

## 요약
- 일정 완료: **{s.completed_tasks}** / {s.total_tasks}
- 일기 작성일: **{s.diary_days}**일
- 습관 달성: **{s.habits_met}** / {s.habits_total}

## 상세 데이터

{collected.context_text}
"""
