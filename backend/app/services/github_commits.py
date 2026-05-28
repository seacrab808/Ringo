from __future__ import annotations

import logging
from datetime import date, timedelta

import httpx

logger = logging.getLogger(__name__)

_GITHUB_API = "https://api.github.com"


async def fetch_commit_dates(
    username: str,
    *,
    token: str,
    date_from: date,
    date_to: date,
) -> set[date]:
    """Return dates (inclusive) on which the user authored at least one commit."""
    if date_from > date_to:
        return set()

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    found: set[date] = set()
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        # Search API: reliable per-day, needs auth for best rate limits
        d = date_from
        while d <= date_to:
            q = f"author:{username} committer-date:{d.isoformat()}"
            try:
                resp = await client.get(
                    f"{_GITHUB_API}/search/commits",
                    params={"q": q, "per_page": 1},
                    headers=headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if int(data.get("total_count") or 0) > 0:
                        found.add(d)
                elif resp.status_code == 422:
                    # Invalid query — skip day
                    pass
                elif resp.status_code in (401, 403):
                    logger.warning("GitHub search auth failed: %s", resp.text[:200])
                    break
            except httpx.HTTPError as exc:
                logger.warning("GitHub search error for %s: %s", d, exc)
            d += timedelta(days=1)

        # Fallback: recent public events (today / yesterday)
        if not token and not found:
            try:
                resp = await client.get(
                    f"{_GITHUB_API}/users/{username}/events/public",
                    params={"per_page": 100},
                    headers=headers,
                )
                if resp.status_code == 200:
                    for ev in resp.json():
                        if ev.get("type") != "PushEvent":
                            continue
                        created = (ev.get("created_at") or "")[:10]
                        try:
                            day = date.fromisoformat(created)
                        except ValueError:
                            continue
                        if date_from <= day <= date_to:
                            payload = ev.get("payload") or {}
                            commits = payload.get("commits") or []
                            if commits:
                                found.add(day)
            except httpx.HTTPError as exc:
                logger.warning("GitHub events error: %s", exc)

    return found
