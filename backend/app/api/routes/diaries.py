from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import require_database, verify_api_token
from app.repositories import diaries as diary_repo
from app.schemas.planner import DiaryOut, DiaryUpsert

router = APIRouter(prefix="/diaries", tags=["diaries"])


@router.get("", response_model=list[DiaryOut])
def list_diaries(
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> list[DiaryOut]:
    if date_to < date_from:
        raise HTTPException(status_code=400, detail="'to' must be >= 'from'")
    return diary_repo.list_diaries(date_from, date_to)


@router.put("/{diary_date}", response_model=DiaryOut)
def upsert_diary(
    diary_date: date,
    body: DiaryUpsert,
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> DiaryOut:
    return diary_repo.upsert_diary(diary_date, body)
