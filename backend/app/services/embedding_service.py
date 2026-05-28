from __future__ import annotations

import logging
import math

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_embed_model

    async def embed(self, text: str, *, client: httpx.AsyncClient | None = None) -> list[float] | None:
        texts = await self.embed_many([text], client=client)
        return texts[0] if texts else None

    async def embed_many(
        self,
        texts: list[str],
        *,
        client: httpx.AsyncClient | None = None,
    ) -> list[list[float] | None]:
        if not texts:
            return []
        payload = {"model": self.model, "input": texts}
        url = f"{self.base}/api/embed"
        timeout = httpx.Timeout(connect=5.0, read=60.0, write=30.0, pool=5.0)
        own = client is None
        if own:
            client = httpx.AsyncClient(timeout=timeout)
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            vectors = data.get("embeddings") or []
            out: list[list[float] | None] = []
            for vec in vectors:
                out.append(list(vec) if vec else None)
            while len(out) < len(texts):
                out.append(None)
            return out
        except Exception as exc:
            logger.warning("Ollama embed failed: %s", exc)
            return [None] * len(texts)
        finally:
            if own and client:
                await client.aclose()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)
