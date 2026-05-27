from datetime import date
from uuid import UUID

from app.db.supabase import get_supabase
from app.schemas.planner import DiaryOut, DiaryUpsert


def _row_to_out(row: dict) -> DiaryOut:
    return DiaryOut(
        id=UUID(str(row["id"])),
        diary_date=date.fromisoformat(row["diary_date"]),
        body=row["body"] or "",
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def list_diaries(date_from: date, date_to: date) -> list[DiaryOut]:
    client = get_supabase()
    resp = (
        client.table("ringo_diaries")
        .select("*")
        .gte("diary_date", date_from.isoformat())
        .lte("diary_date", date_to.isoformat())
        .order("diary_date")
        .execute()
    )
    return [_row_to_out(r) for r in (resp.data or [])]


def upsert_diary(diary_date: date, data: DiaryUpsert) -> DiaryOut:
    client = get_supabase()
    payload = {"diary_date": diary_date.isoformat(), "body": data.body}
    resp = (
        client.table("ringo_diaries")
        .upsert(payload, on_conflict="diary_date")
        .execute()
    )
    return _row_to_out(resp.data[0])
