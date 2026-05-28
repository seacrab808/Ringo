from uuid import UUID

from app.db.supabase import get_supabase
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate


def _row_to_out(row: dict) -> CategoryOut:
    return CategoryOut(
        id=UUID(str(row["id"])),
        slug=row["slug"],
        label=row["label"],
        color_hex=row["color_hex"],
        sort_order=row["sort_order"],
        created_at=row["created_at"],
    )


def list_categories() -> list[CategoryOut]:
    client = get_supabase()
    resp = (
        client.table("ringo_categories")
        .select("*")
        .order("sort_order")
        .execute()
    )
    return [_row_to_out(r) for r in (resp.data or [])]


def create_category(data: CategoryCreate) -> CategoryOut:
    client = get_supabase()
    payload = data.model_dump()
    resp = client.table("ringo_categories").insert(payload).execute()
    return _row_to_out(resp.data[0])


def update_category(slug: str, data: CategoryUpdate) -> CategoryOut | None:
    client = get_supabase()
    payload = data.model_dump(exclude_unset=True, exclude_none=True)
    if not payload:
        return get_category(slug)
    resp = client.table("ringo_categories").update(payload).eq("slug", slug).execute()
    if not resp.data:
        return None
    return _row_to_out(resp.data[0])


def get_category(slug: str) -> CategoryOut | None:
    client = get_supabase()
    resp = client.table("ringo_categories").select("*").eq("slug", slug).maybe_single().execute()
    if not resp.data:
        return None
    return _row_to_out(resp.data)


def delete_category(slug: str) -> bool:
    client = get_supabase()
    client.table("ringo_categories").delete().eq("slug", slug).execute()
    return True
