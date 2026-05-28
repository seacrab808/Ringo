from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx

from app.schemas.cafeteria import CafeteriaDayMenu, CafeteriaMenuItem, SogangCafeteriaWeek

logger = logging.getLogger(__name__)

# Nuxt apiBase is https://www.sogang.ac.kr/api/ → full path uses /api/api/v1/...
SOGANG_MENU_API = "https://www.sogang.ac.kr/api/api/v1/mainKo/menuList"
BW_HALL_CONFIG_ID = 1
KST = ZoneInfo("Asia/Seoul")
_WEEKDAY_KO = ("월", "화", "수", "목", "금", "토", "일")

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Origin": "https://www.sogang.ac.kr",
    "Referer": "https://www.sogang.ac.kr/ko/menu-life-info",
    "Content-Type": "application/json",
}


def _fmt_api(d: date) -> str:
    return d.strftime("%Y.%m.%d")


def _parse_api(s: str) -> date:
    return datetime.strptime(s.replace(".", "-"), "%Y-%m-%d").date()


def week_range_mon_fri(anchor: date | None = None) -> tuple[date, date]:
    """University cafeteria posts Mon–Fri weeks."""
    d = anchor or datetime.now(KST).date()
    monday = d - timedelta(days=d.weekday())
    friday = monday + timedelta(days=4)
    return monday, friday


def shift_week(start: date, end: date, delta_weeks: int) -> tuple[date, date]:
    delta = timedelta(days=7 * delta_weeks)
    return start + delta, end + delta


def _cache_path(cache_dir: Path, start: date, end: date) -> Path:
    return cache_dir / f"bw_{start.isoformat()}_{end.isoformat()}.json"


def _normalize_menu_html(raw: str) -> str:
    if not raw:
        return ""
    text = raw.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


class SogangCafeteriaClient:
    def __init__(self, cache_dir: Path | None = None) -> None:
        backend_root = Path(__file__).resolve().parents[2]
        self.cache_dir = cache_dir or (backend_root / "storage" / "cafeteria_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _load_cache(self, start: date, end: date) -> SogangCafeteriaWeek | None:
        path = _cache_path(self.cache_dir, start, end)
        if not path.is_file():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return SogangCafeteriaWeek.model_validate(data)
        except Exception:
            return None

    def _save_cache(self, payload: SogangCafeteriaWeek) -> None:
        start = date.fromisoformat(payload.start_date)
        end = date.fromisoformat(payload.end_date)
        path = _cache_path(self.cache_dir, start, end)
        path.write_text(payload.model_dump_json(indent=2), encoding="utf-8")

    async def fetch_week(
        self,
        start: date,
        end: date,
        *,
        use_cache: bool = True,
        max_cache_hours: int = 6,
    ) -> SogangCafeteriaWeek:
        if use_cache:
            cached = self._load_cache(start, end)
            if cached:
                try:
                    fetched = datetime.fromisoformat(cached.fetched_at)
                    age_h = (datetime.now(KST) - fetched.astimezone(KST)).total_seconds() / 3600
                    if age_h < max_cache_hours and not cached.error:
                        cached.cached = True
                        return cached
                except ValueError:
                    pass

        body = {
            "configId": BW_HALL_CONFIG_ID,
            "stDate": _fmt_api(start),
            "enDate": _fmt_api(end),
        }

        try:
            async with httpx.AsyncClient(timeout=20.0, headers=_BROWSER_HEADERS) as client:
                resp = await client.post(SOGANG_MENU_API, json=body)
                resp.raise_for_status()
                raw = resp.json()
        except httpx.HTTPStatusError as exc:
            logger.warning("Sogang menu API HTTP %s", exc.response.status_code)
            stale = self._load_cache(start, end) if use_cache else None
            if stale and stale.days:
                stale.cached = True
                stale.error = (
                    f"최신 식단을 가져오지 못했습니다 (HTTP {exc.response.status_code}). "
                    "아래는 이전에 저장된 데이터입니다."
                )
                return stale
            return self._error_week(
                start,
                end,
                f"서강대 식단 API 접근 실패 (HTTP {exc.response.status_code}). "
                "잠시 후 다시 시도하거나 공식 페이지를 확인해 주세요.",
            )
        except Exception as exc:
            logger.warning("Sogang menu API error: %s", exc)
            return self._error_week(
                start,
                end,
                "식단을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
            )

        payload = self._parse_response(raw, start, end)
        self._save_cache(payload)
        return payload

    def _parse_response(self, raw: dict, start: date, end: date) -> SogangCafeteriaWeek:
        data = raw.get("data") or raw
        menu_list = data.get("menuList") or []
        origin = _normalize_menu_html(str(data.get("origin") or ""))

        days: list[CafeteriaDayMenu] = []
        for row in menu_list:
            menu_date_raw = str(row.get("menuDate") or "")
            try:
                d = _parse_api(menu_date_raw[:10])
                weekday = _WEEKDAY_KO[d.weekday()]
                menu_date = d.isoformat()
            except ValueError:
                menu_date = menu_date_raw[:10]
                weekday = ""

            items: list[CafeteriaMenuItem] = []
            for info in row.get("menuInfo") or []:
                if not info:
                    continue
                items.append(
                    CafeteriaMenuItem(
                        category=str(info.get("category") or "").strip(),
                        menu=_normalize_menu_html(str(info.get("menu") or "")),
                    )
                )

            days.append(
                CafeteriaDayMenu(
                    date=menu_date,
                    weekday=weekday,
                    items=items,
                )
            )

        return SogangCafeteriaWeek(
            start_date=start.isoformat(),
            end_date=end.isoformat(),
            origin=origin,
            days=days,
            fetched_at=datetime.now(KST).isoformat(),
            cached=False,
        )

    def _error_week(self, start: date, end: date, message: str) -> SogangCafeteriaWeek:
        return SogangCafeteriaWeek(
            start_date=start.isoformat(),
            end_date=end.isoformat(),
            days=[],
            fetched_at=datetime.now(KST).isoformat(),
            error=message,
        )
