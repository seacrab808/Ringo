from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import verify_api_token
from app.core.exceptions import OllamaConnectionError, OllamaParseError
from app.schemas.schedule import (
    NaturalLanguageParseRequest,
    NaturalLanguageParseResponse,
    TaskListSortRequest,
    TaskListSortResponse,
    parse_response_to_tasks,
    sort_tasks,
)
from app.services.ollama_parser import OllamaScheduleParser

router = APIRouter(prefix="/parse", tags=["parse"])


@router.post(
    "/schedule",
    response_model=NaturalLanguageParseResponse,
    summary="자연어 → Google Calendar 스타일 일정 JSON",
)
async def parse_schedule(
    payload: NaturalLanguageParseRequest,
    _: None = Depends(verify_api_token),
) -> NaturalLanguageParseResponse:
    """
    사용자 채팅 문장을 Ollama로 파싱해 구조화된 일정 목록을 반환합니다.

    예: "이번주 금요일 오후 2시에 딥러닝 수업 있어"
    → `is_time_fixed: true`, `start` 14:00, `summary`: "딥러닝 수업"
    """
    parser = OllamaScheduleParser()
    try:
        return await parser.parse(payload)
    except OllamaConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except OllamaParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.post(
    "/schedule/with-tasks",
    summary="파싱 + Tasks 리스트 정렬 키 적용",
)
async def parse_schedule_with_tasks(
    payload: NaturalLanguageParseRequest,
    start_order: int = 0,
    _: None = Depends(verify_api_token),
) -> dict:
    """Parse NL text and return sorted task rows for the dashboard Tasks column."""
    parser = OllamaScheduleParser()
    try:
        parsed = await parser.parse(payload)
    except OllamaConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except OllamaParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    tasks = parse_response_to_tasks(parsed, start_order=start_order)
    return {
        "parse": parsed.model_dump(mode="json"),
        "tasks": [t.model_dump(mode="json") for t in tasks],
        "fixed_count": sum(1 for t in tasks if t.is_time_fixed),
        "unfixed_count": sum(1 for t in tasks if not t.is_time_fixed),
    }


@router.post(
    "/tasks/sort",
    response_model=TaskListSortResponse,
    summary="Tasks 정렬 (시간 고정 ↑, 미정 ↓)",
)
async def sort_task_list(
    payload: TaskListSortRequest,
    _: None = Depends(verify_api_token),
) -> TaskListSortResponse:
    sorted_tasks = sort_tasks(payload.tasks)
    return TaskListSortResponse(
        tasks=sorted_tasks,
        fixed_count=sum(1 for t in sorted_tasks if t.is_time_fixed),
        unfixed_count=sum(1 for t in sorted_tasks if not t.is_time_fixed),
    )
