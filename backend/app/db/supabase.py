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


def _supabase_ping() -> bool:
    client = get_supabase()
    client.table("ringo_tasks").select("id").limit(1).execute()
    return True


def supabase_health_ok() -> bool:
    if not get_settings().supabase_enabled:
        return False
    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            fut = pool.submit(_supabase_ping)
            return fut.result(timeout=3.0)
    except (FuturesTimeout, Exception):
        return False
