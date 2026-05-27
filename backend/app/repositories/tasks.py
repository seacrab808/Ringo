from datetime import date, datetime
from uuid import UUID

from app.db.supabase import get_supabase
from app.schemas.planner import TaskCreate, TaskOut, TaskUpdate


def _serialize_field(key: str, val: object) -> object:
    if val is None:
        return None
    if key == "id":
        return str(val)
    if isinstance(val, date) and not isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, datetime):
        return val.isoformat()
    return val


def _row_to_out(row: dict) -> TaskOut:
    return TaskOut(
        id=UUID(str(row["id"])),
        summary=row["summary"],
        timetable_label=row["timetable_label"],
        is_time_fixed=row["is_time_fixed"],
        planned_date=date.fromisoformat(row["planned_date"]) if row.get("planned_date") else None,
        start_at=row.get("start_at"),
        end_at=row.get("end_at"),
        deadline_at=row.get("deadline_at"),
        category=row["category"],
        category_color=row["category_color"],
        created_order=row["created_order"],
        list_order=row["list_order"],
        completed=row["completed"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _task_payload(data: TaskCreate | TaskUpdate, *, partial: bool = False) -> dict:
    fields = data.model_dump(exclude_unset=partial, exclude_none=True)
    return {key: _serialize_field(key, val) for key, val in fields.items()}


def list_tasks(date_from: date, date_to: date) -> list[TaskOut]:
    client = get_supabase()
    resp = (
        client.table("ringo_tasks")
        .select("*")
        .gte("planned_date", date_from.isoformat())
        .lte("planned_date", date_to.isoformat())
        .order("list_order")
        .execute()
    )
    rows = resp.data or []
    return [_row_to_out(r) for r in rows]


def get_task(task_id: UUID) -> TaskOut | None:
    client = get_supabase()
    resp = client.table("ringo_tasks").select("*").eq("id", str(task_id)).maybe_single().execute()
    if not resp.data:
        return None
    return _row_to_out(resp.data)


def create_task(data: TaskCreate) -> TaskOut:
    client = get_supabase()
    payload = _task_payload(data)
    if data.id:
        payload["id"] = str(data.id)
    resp = client.table("ringo_tasks").insert(payload).execute()
    return _row_to_out(resp.data[0])


def update_task(task_id: UUID, data: TaskUpdate) -> TaskOut | None:
    client = get_supabase()
    payload = _task_payload(data, partial=True)
    if not payload:
        return await get_task(task_id)
    resp = (
        client.table("ringo_tasks")
        .update(payload)
        .eq("id", str(task_id))
        .execute()
    )
    if not resp.data:
        return None
    return _row_to_out(resp.data[0])


def delete_task(task_id: UUID) -> bool:
    client = get_supabase()
    client.table("ringo_tasks").delete().eq("id", str(task_id)).execute()
    return True


def reorder_tasks(planned_date: date, task_ids: list[UUID]) -> list[TaskOut]:
    client = get_supabase()
    updated: list[TaskOut] = []
    for i, tid in enumerate(task_ids):
        resp = (
            client.table("ringo_tasks")
            .update({"list_order": i})
            .eq("id", str(tid))
            .eq("planned_date", planned_date.isoformat())
            .execute()
        )
        if resp.data:
            updated.append(_row_to_out(resp.data[0]))
    return updated


def list_timed_tasks_for_day(day: date) -> list[dict]:
    """Tasks that may appear on the motemote axis for `day` (includes overnight)."""
    client = get_supabase()
    prev = (day.fromordinal(day.toordinal() - 1)).isoformat()
    next_day = (day.fromordinal(day.toordinal() + 1)).isoformat()
    resp = (
        client.table("ringo_tasks")
        .select("*")
        .eq("is_time_fixed", True)
        .not_.is_("start_at", "null")
        .gte("planned_date", prev)
        .lte("planned_date", next_day)
        .execute()
    )
    return resp.data or []
