from __future__ import annotations

import logging
from pathlib import Path

import httpx

from app.config import Settings
from app.services.embedding_service import EmbeddingService, cosine_similarity
from app.services.few_shot_selector import load_few_shot_catalog, select_few_shots
from app.services.rag_chunk import TextChunk, retrieve_top_chunks
from app.services.study_guide_prompt import (
    build_study_guide_system_prompt,
    build_study_guide_user_prompt,
)
from app.services.study_guide_text import sanitize_study_guide_output

logger = logging.getLogger(__name__)


class StudyGuideGenerator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        backend_root = Path(__file__).resolve().parents[2]
        raw = Path(settings.study_guide_few_shot_dir)
        self.few_shot_dir = raw if raw.is_absolute() else backend_root / raw
        self._embedder = EmbeddingService(settings)

    async def load_few_shot_bodies(
        self,
        query: str,
        *,
        max_examples: int | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> list[str]:
        if max_examples is None:
            max_examples = self.settings.study_guide_few_shot_count
        max_chars = self.settings.study_guide_few_shot_max_chars
        catalog = load_few_shot_catalog(self.few_shot_dir)
        if not catalog:
            return []

        emb_scores: dict[str, float] = {}
        if self.settings.rag_use_embeddings:
            q_vec = await self._embedder.embed(query, client=client)
            if q_vec:
                for ex in catalog:
                    meta = f"{ex.week} {ex.title} {' '.join(ex.topics)}"
                    ex_vec = await self._embedder.embed(meta[:2000], client=client)
                    if ex_vec:
                        emb_scores[ex.path.name] = cosine_similarity(q_vec, ex_vec)

        picked = select_few_shots(
            query,
            catalog,
            max_examples=max_examples,
            embedding_scores=emb_scores or None,
        )
        logger.info(
            "few-shot selected: %s",
            [f"{p.week}({p.path.name})" for p in picked],
        )
        return [p.body[:max_chars] for p in picked]

    def build_prompt(
        self,
        *,
        task_title: str,
        lecture_topic: str | None,
        extra_instructions: str | None,
        rag_chunks: list[TextChunk],
        few_shots: list[str],
    ) -> str:
        few_shot_block = ""
        if few_shots:
            parts = []
            for i, ex in enumerate(few_shots, 1):
                parts.append(f"--- 예시 {i} ---\n{ex}\n")
            few_shot_block = "\n".join(parts)

        rag_block = ""
        if rag_chunks:
            parts = []
            for ch in rag_chunks:
                parts.append(f"[chunk {ch.index}]\n{ch.content}\n")
            rag_block = "\n".join(parts)

        return build_study_guide_user_prompt(
            settings=self.settings,
            task_title=task_title,
            lecture_topic=lecture_topic,
            extra_instructions=extra_instructions,
            few_shot_block=few_shot_block,
            rag_block=rag_block,
            rag_chunk_count=len(rag_chunks),
        )

    def _select_rag_chunks(
        self,
        query: str,
        chunks: list[TextChunk],
        *,
        chunk_embeddings: list[list[float] | None] | None = None,
    ) -> list[TextChunk]:
        """Prefer full coverage; cap by top-k when material is huge."""
        top_k = self.settings.study_guide_rag_top_k
        total_chars = sum(len(c.content) for c in chunks)
        if len(chunks) <= top_k or total_chars < 45_000:
            return chunks
        if (
            self.settings.rag_use_embeddings
            and chunk_embeddings
            and any(chunk_embeddings)
        ):
            return None  # signal async path
        return retrieve_top_chunks(query, chunks, top_k=top_k)

    async def generate(
        self,
        prompt: str,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> tuple[str, str]:
        settings = self.settings
        model = settings.study_guide_model
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": build_study_guide_system_prompt()},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "options": {
                "num_predict": settings.study_guide_num_predict,
                "temperature": settings.study_guide_temperature,
            },
            "keep_alive": settings.ollama_keep_alive,
        }
        url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
        timeout = httpx.Timeout(
            connect=settings.ollama_connect_timeout_seconds,
            read=settings.study_guide_timeout_seconds,
            write=30.0,
            pool=5.0,
        )
        own = client is None
        if own:
            client = httpx.AsyncClient(timeout=timeout)
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            msg = data.get("message") or {}
            text = (msg.get("content") or data.get("response") or "").strip()
            text = sanitize_study_guide_output(text)
            return text, model
        finally:
            if own and client:
                await client.aclose()

    async def retrieve_chunks(
        self,
        query: str,
        chunks: list[TextChunk],
        *,
        chunk_embeddings: list[list[float] | None] | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> list[TextChunk]:
        top_k = self.settings.study_guide_rag_top_k
        pre = self._select_rag_chunks(
            query, chunks, chunk_embeddings=chunk_embeddings
        )
        if pre is not None:
            return pre

        if (
            self.settings.rag_use_embeddings
            and chunk_embeddings
            and any(chunk_embeddings)
        ):
            q_vec = await self._embedder.embed(query, client=client)
            if q_vec:
                scored: list[tuple[float, TextChunk]] = []
                for ch, emb in zip(chunks, chunk_embeddings):
                    if emb:
                        scored.append((cosine_similarity(q_vec, emb), ch))
                scored.sort(key=lambda x: -x[0])
                top = [ch for s, ch in scored[:top_k] if s > 0.05]
                if top:
                    return top
        return retrieve_top_chunks(query, chunks, top_k=top_k)

    async def generate_for_task(
        self,
        *,
        task_title: str,
        lecture_topic: str | None,
        extra_instructions: str | None,
        source_chunks: list[TextChunk],
        chunk_embeddings: list[list[float] | None] | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> tuple[str, str]:
        query = f"{task_title} {lecture_topic or ''}".strip()
        selected = await self.retrieve_chunks(
            query,
            source_chunks,
            chunk_embeddings=chunk_embeddings,
            client=client,
        )
        few_shots = await self.load_few_shot_bodies(query, client=client)
        prompt = self.build_prompt(
            task_title=task_title,
            lecture_topic=lecture_topic,
            extra_instructions=extra_instructions,
            rag_chunks=selected,
            few_shots=few_shots,
        )
        logger.info(
            "study_guide prompt chars=%d few_shots=%d rag_chunks=%d",
            len(prompt),
            len(few_shots),
            len(selected),
        )
        return await self.generate(prompt, client=client)

    async def revise_study_guide(
        self,
        *,
        current_html: str,
        instruction: str,
        task_title: str,
        client: httpx.AsyncClient | None = None,
    ) -> tuple[str, str]:
        from app.services.study_guide_prompt import build_study_guide_system_prompt

        trimmed = current_html.strip()
        if len(trimmed) > 48000:
            trimmed = trimmed[:48000] + "\n<!-- ... truncated ... -->"

        user_prompt = f"""## 현재 학습지 (HTML)
{trimmed}

## 수정 요청
{instruction.strip()}

## 지시
- 위 학습지 전체를 요청에 맞게 수정한다.
- 출력은 수정된 **완전한 HTML 문서** 하나(`<!DOCTYPE html>` ~ `</html>`)만 반환한다.
- 기존 디자인 클래스(`.sg-section`, `.sg-card`, `.sg-term-card` 등)와 한국어·A4 스타일을 유지한다.
- 수업/일정: {task_title}
"""
        settings = self.settings
        model = settings.study_guide_model
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": build_study_guide_system_prompt()
                    + "\n지금은 기존 학습지를 사용자 지시에 따라 **개정**하는 단계이다.",
                },
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "options": {
                "num_predict": settings.study_guide_num_predict,
                "temperature": settings.study_guide_temperature,
            },
            "keep_alive": settings.ollama_keep_alive,
        }
        url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
        timeout = httpx.Timeout(
            connect=settings.ollama_connect_timeout_seconds,
            read=settings.study_guide_timeout_seconds,
            write=30.0,
            pool=5.0,
        )
        own = client is None
        if own:
            client = httpx.AsyncClient(timeout=timeout)
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            msg = data.get("message") or {}
            text = (msg.get("content") or data.get("response") or "").strip()
            text = sanitize_study_guide_output(text)
            return text, model
        finally:
            if own and client:
                await client.aclose()
