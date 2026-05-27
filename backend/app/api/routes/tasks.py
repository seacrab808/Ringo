from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import require_database, verify_api_token
from app.repositories import tasks as task_repo
from app.schemas.planner import TaskCreate, TaskOut, TaskReorderBody, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
def list_tasks(
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> list[TaskOut]:
    if date_to < date_from:
        raise HTTPException(status_code=400, detail="'to' must be >= 'from'")
    return task_repo.list_tasks(date_from, date_to)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate,
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> TaskOut:
    return task_repo.create_task(body)


@router.patch("/{task_id}", response_model=TaskOut)
def patch_task(
    task_id: UUID,
    body: TaskUpdate,
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> TaskOut:
    updated = task_repo.update_task(task_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_task(
    task_id: UUID,
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> None:
    task_repo.delete_task(task_id)


@router.put("/reorder", response_model=list[TaskOut])
def reorder_tasks(
    body: TaskReorderBody,
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> list[TaskOut]:
    return task_repo.reorder_tasks(body.planned_date, body.task_ids)
