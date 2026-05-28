from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from app.services.rag_chunk import _tokenize


@dataclass
class FewShotExample:
    path: Path
    week: str
    title: str
    topics: list[str]
    body: str
    course: str = ""


_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_few_shot_file(path: Path) -> FewShotExample | None:
    raw = path.read_text(encoding="utf-8")
    week = path.stem
    title = week
    topics: list[str] = []
    course = ""

    m = _FRONTMATTER_RE.match(raw)
    body = raw[m.end() :] if m else raw
    if m:
        fm = m.group(1)
        for line in fm.splitlines():
            if line.startswith("week:"):
                week = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("title:"):
                title = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("course:"):
                course = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("topics:"):
                val = line.split(":", 1)[1].strip()
                topics = [
                    t.strip().strip('"').strip("'")
                    for t in val.strip("[]").split(",")
                    if t.strip()
                ]

    if not topics:
        topics = [title, week]
    return FewShotExample(
        path=path,
        week=week,
        title=title,
        topics=topics,
        body=body.strip(),
        course=course,
    )


def load_few_shot_catalog(directory: Path) -> list[FewShotExample]:
    if not directory.is_dir():
        return []
    out: list[FewShotExample] = []
    for path in sorted(directory.glob("*.md")):
        if path.name.endswith("_placeholder.md"):
            continue
        ex = parse_few_shot_file(path)
        if ex and ex.body:
            out.append(ex)
    return out


def _week_in_query(query: str, week: str) -> bool:
    digits = re.sub(r"\D", "", week)
    if not digits:
        return False
    return digits in re.sub(r"\D", "", query) or week in query


def select_few_shots(
    query: str,
    catalog: list[FewShotExample],
    *,
    max_examples: int = 2,
    embedding_scores: dict[str, float] | None = None,
) -> list[FewShotExample]:
    if not catalog:
        return []
    if len(catalog) <= max_examples:
        return catalog

    q_tokens = _tokenize(query)
    scored: list[tuple[float, FewShotExample]] = []

    for ex in catalog:
        score = 0.0
        if _week_in_query(query, ex.week):
            score += 10.0
        if ex.course and ex.course in query:
            score += 6.0
        meta_tokens = _tokenize(" ".join([ex.week, ex.title, ex.course, *ex.topics]))
        score += len(q_tokens & meta_tokens) * 1.5
        body_tokens = _tokenize(ex.body[:1500])
        score += len(q_tokens & body_tokens) * 0.3
        if embedding_scores and ex.path.name in embedding_scores:
            score += embedding_scores[ex.path.name] * 5.0
        scored.append((score, ex))

    scored.sort(key=lambda x: (-x[0], x[1].week))
    return [ex for _, ex in scored[:max_examples]]
