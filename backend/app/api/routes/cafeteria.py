from datetime import date

from fastapi import APIRouter, Query

from app.schemas.cafeteria import SogangCafeteriaWeek
from app.services.sogang_cafeteria import (
    SogangCafeteriaClient,
    shift_week,
    week_range_mon_fri,
)

router = APIRouter(prefix="/cafeteria", tags=["cafeteria"])

_client = SogangCafeteriaClient()


@router.get("/sogang/bw", response_model=SogangCafeteriaWeek)
async def get_sogang_bw_menu(
    week_offset: int = Query(
        0,
        description="0=이번 주, -1=지난 주, 1=다음 주",
    ),
    refresh: bool = Query(False, description="캐시 무시"),
) -> SogangCafeteriaWeek:
    """
    서강대 베르크만스우정원(BW관) 우정학식 주간 식단.
    공식 API: POST https://www.sogang.ac.kr/api/api/v1/mainKo/menuList (configId=1)
    """
    start, end = week_range_mon_fri()
    if week_offset:
        start, end = shift_week(start, end, week_offset)
    return await _client.fetch_week(start, end, use_cache=not refresh)


@router.get("/sogang/bw/range", response_model=SogangCafeteriaWeek)
async def get_sogang_bw_menu_range(
    start: date = Query(..., description="시작일 (월)"),
    end: date = Query(..., description="종료일 (금)"),
    refresh: bool = False,
) -> SogangCafeteriaWeek:
    return await _client.fetch_week(start, end, use_cache=not refresh)
