from datetime import date, datetime
from uuid import UUID

from app.db.supabase import get_supabase
from app.schemas.planner import TaskCreate, TaskOut, TaskUpdate
from app.schemas.recurrence import TaskRecurrence
from app.services.recurrence_expand import parse_recurrence


def _serialize_field(key: str, val: object) -> object:
    if val is None:
        return None
    if key == "id":
        return str(val)
    if key == "recurrence" and hasattr(val, "model_dump"):
        return val.model_dump(mode="json")
    if isinstance(val, date) and not isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, datetime):
        return val.isoformat()
    return val


def _row_to_out(row: dict) -> TaskOut:
    rec = parse_recurrence(row.get("recurrence"))
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
        recurrence=rec,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _task_payload(data: TaskCreate | TaskUpdate, *, partial: bool = False) -> dict:
    fields = data.model_dump(exclude_unset=partial, exclude_none=True)
    return {key: _serialize_field(key, val) for key, val in fields.items()}


def list_tasks(date_from: date, date_to: date) -> list[TaskOut]:
    client = get_supabase()
    one_off = (
        client.table("ringo_tasks")
        .select("*")
        .gte("planned_date", date_from.isoformat())
        .lte("planned_date", date_to.isoformat())
        .is_("recurrence", "null")
        .order("list_order")
        .execute()
    )
    recurring = (
        client.table("ringo_tasks")
        .select("*")
        .not_.is_("recurrence", "null")
        .execute()
    )
    by_id: dict[str, dict] = {}
    for row in (one_off.data or []) + (recurring.data or []):
        by_id[str(row["id"])] = row
    return [_row_to_out(r) for r in by_id.values()]


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
        return get_task(task_id)
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


def reorder_tasks(planned_date: date, task_ids: list[str]) -> list[TaskOut]:
    client = get_supabase()
    updated: list[TaskOut] = []
    for i, tid in enumerate(task_ids):
        base_id = tid.split("@", 1)[0]
        try:
            uuid_tid = UUID(base_id)
        except ValueError:
            continue
        resp = (
            client.table("ringo_tasks")
            .update({"list_order": i})
            .eq("id", str(uuid_tid))
            .eq("planned_date", planned_date.isoformat())
            .execute()
        )
        if resp.data:
            updated.append(_row_to_out(resp.data[0]))
    return updated


def cancel_recurrence_date(task_id: UUID, cancel_date: date) -> TaskOut | None:
    task = get_task(task_id)
    if not task or not task.recurrence:
        return task
    rec = task.recurrence
    iso = cancel_date.isoformat()
    existing = {d.isoformat() for d in rec.cancelled_dates}
    if iso in existing:
        return task
    rec.cancelled_dates.append(cancel_date)
    return update_task(task_id, TaskUpdate(recurrence=rec))


def list_timed_tasks_for_day(day: date) -> list[dict]:
    """Timed rows for timetable: one-off + expanded recurring instances."""
    from app.config import get_settings
    from app.services.recurrence_expand import instance_times, occurs_on_date

    client = get_supabase()
    prev = (day.fromordinal(day.toordinal() - 1)).isoformat()
    next_day = (day.fromordinal(day.toordinal() + 1)).isoformat()
    one_off = (
        client.table("ringo_tasks")
        .select("*")
        .eq("is_time_fixed", True)
        .not_.is_("start_at", "null")
        .gte("planned_date", prev)
        .lte("planned_date", next_day)
        .is_("recurrence", "null")
        .execute()
    )
    recurring = (
        client.table("ringo_tasks")
        .select("*")
        .not_.is_("recurrence", "null")
        .execute()
    )
    settings = get_settings()
    rows: list[dict] = list(one_off.data or [])
    for row in recurring.data or []:
        rule = parse_recurrence(row.get("recurrence"))
        if not rule or not occurs_on_date(rule, day):
            continue
        times = instance_times(
            day,
            rule,
            tz=settings.ringo_timezone,
            duration_minutes=settings.default_event_duration_minutes,
        )
        if not times:
            continue
        start, end = times
        inst = dict(row)
        inst["planned_date"] = day.isoformat()
        inst["start_at"] = start.isoformat()
        inst["end_at"] = end.isoformat()
        inst["id"] = f"{row['id']}@{day.isoformat()}"
        rows.append(inst)
    return rows
