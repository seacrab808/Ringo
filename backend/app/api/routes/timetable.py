from datetime import date

from fastapi import APIRouter, Depends

from app.core.deps import require_database, verify_api_token
from app.repositories import tasks as task_repo
from app.schemas.planner import TimetableDayOut
from app.services.timetable_blocks import build_timetable_for_day

router = APIRouter(prefix="/timetable", tags=["timetable"])


@router.get("/{day}", response_model=TimetableDayOut)
def get_timetable_for_day(
    day: date,
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> TimetableDayOut:
    rows = task_repo.list_timed_tasks_for_day(day)
    return build_timetable_for_day(rows, day)
