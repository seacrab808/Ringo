from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class TextChunk:
    index: int
    content: str
    token_estimate: int


def chunk_text(
    text: str,
    *,
    chunk_size: int = 800,
    overlap: int = 120,
) -> list[TextChunk]:
    text = re.sub(r"\n{3,}", "\n\n", text.strip())
    if not text:
        return []

    chunks: list[TextChunk] = []
    start = 0
    idx = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        piece = text[start:end].strip()
        if piece:
            chunks.append(
                TextChunk(
                    index=idx,
                    content=piece,
                    token_estimate=max(1, len(piece) // 4),
                )
            )
            idx += 1
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return chunks


def _tokenize(s: str) -> set[str]:
    return {t for t in re.findall(r"[\w가-힣]{2,}", s.lower()) if len(t) >= 2}


def retrieve_top_chunks(
    query: str,
    chunks: list[TextChunk],
    *,
    top_k: int = 8,
) -> list[TextChunk]:
    if not chunks:
        return []
    q = _tokenize(query)
    if not q:
        return chunks[:top_k]

    scored: list[tuple[float, TextChunk]] = []
    for ch in chunks:
        t = _tokenize(ch.content)
        if not t:
            continue
        overlap = len(q & t)
        score = overlap / (len(q) ** 0.5)
        scored.append((score, ch))

    scored.sort(key=lambda x: (-x[0], x[1].index))
    if not scored or scored[0][0] <= 0:
        return chunks[:top_k]
    return [ch for _, ch in scored[:top_k]]
