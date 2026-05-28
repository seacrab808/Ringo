from datetime import date

from app.schemas.report import ReportClientContext, ReportClientTaskSnapshot
from app.services.report_collector import collect_report_data


def test_collect_with_client_context():
    ctx = ReportClientContext(
        tasks=[
            ReportClientTaskSnapshot(
                summary="보고서 작성",
                planned_date="2026-05-26",
                completed=True,
                category="research",
            ),
            ReportClientTaskSnapshot(
                summary="미완료 과제",
                planned_date="2026-05-27",
                completed=False,
                category="class",
            ),
        ],
        diaries={"2026-05-26": "오늘 집중 잘 됨"},
    )
    data = collect_report_data(
        period="week",
        start=date(2026, 5, 25),
        end=date(2026, 5, 31),
        anchor=date(2026, 5, 28),
        client_context=ctx,
    )
    assert data.stats.total_tasks == 2
    assert data.stats.completed_tasks == 1
    assert data.stats.diary_days == 1
    assert "보고서 작성" in data.context_text
