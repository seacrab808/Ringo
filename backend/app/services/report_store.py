from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from app.config import Settings, get_settings
from app.schemas.report import ReportOut


def _cache_path(cache_dir: Path, period: str, start: date, end: date) -> Path:
    return cache_dir / f"{period}_{start.isoformat()}_{end.isoformat()}.json"


class ReportStore:
    def __init__(self, settings: Settings | None = None) -> None:
        settings = settings or get_settings()
        backend_root = Path(__file__).resolve().parents[2]
        raw = Path(getattr(settings, "report_storage_dir", "storage/reports"))
        self.cache_dir = raw if raw.is_absolute() else backend_root / raw
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def load(self, period: str, start: date, end: date) -> ReportOut | None:
        path = _cache_path(self.cache_dir, period, start, end)
        if not path.is_file():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            out = ReportOut.model_validate(data)
            out.cached = True
            return out
        except Exception:
            return None

    def save(self, report: ReportOut) -> None:
        start = date.fromisoformat(report.start_date)
        end = date.fromisoformat(report.end_date)
        path = _cache_path(self.cache_dir, report.period.value, start, end)
        payload = report.model_copy(update={"cached": False})
        path.write_text(payload.model_dump_json(indent=2), encoding="utf-8")
