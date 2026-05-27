from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


class SupabaseNotConfiguredError(RuntimeError):
    pass


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    if not settings.supabase_enabled:
        raise SupabaseNotConfiguredError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def supabase_health_ok() -> bool:
    if not get_settings().supabase_enabled:
        return False
    try:
        client = get_supabase()
        client.table("ringo_tasks").select("id").limit(1).execute()
        return True
    except Exception:
        return False
