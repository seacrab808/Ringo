#!/usr/bin/env python3
"""Extract PDF text into a few-shot Markdown file for Ringo study-guide generation."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


def extract_pdf_text(path: Path) -> str:
    try:
        import fitz  # pymupdf
    except ImportError as exc:
        raise SystemExit("Install pymupdf: pip install pymupdf") from exc

    doc = fitz.open(path)
    parts: list[str] = []
    for page in doc:
        parts.append(page.get_text("text"))
    doc.close()
    return "\n\n".join(parts).strip()


def normalize(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def build_markdown(
    *,
    body: str,
    week: str,
    title: str,
    topics: list[str],
    course: str | None,
    source_pdf: str | None,
) -> str:
    topics_yaml = ", ".join(f'"{t}"' for t in topics)
    lines = [
        "---",
        f'week: "{week}"',
        f'title: "{title}"',
        f"topics: [{topics_yaml}]",
    ]
    if course:
        lines.append(f'course: "{course}"')
    if source_pdf:
        lines.append(f'source: "{source_pdf}"')
    lines.extend(["---", ""])
    lines.append(f"# {title}")
    lines.append("")
    lines.append(
        "<!-- Ringo few-shot: 분량·구조·수식 밀도 참고. HTML 생성 시 이 깊이를 따른다. -->"
    )
    lines.append("")
    lines.append(body)
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="PDF → few-shot Markdown (YAML frontmatter)")
    parser.add_argument("pdf", type=Path, help="Source PDF path")
    parser.add_argument("--out", type=Path, required=True, help="Output .md path")
    parser.add_argument("--week", type=str, default=None, help="week id (e.g. 0304)")
    parser.add_argument("--title", type=str, default=None, help="Document title")
    parser.add_argument(
        "--topics",
        type=str,
        default="",
        help='Comma-separated topics (e.g. "Transformer,Attention")',
    )
    parser.add_argument("--course", type=str, default=None, help="Course name for matching")
    parser.add_argument(
        "--max-chars",
        type=int,
        default=0,
        help="Truncate body (0 = no limit; few-shot loader also caps)",
    )
    args = parser.parse_args()

    if not args.pdf.is_file():
        raise SystemExit(f"PDF not found: {args.pdf}")

    week = args.week or args.pdf.stem
    title = args.title or args.pdf.stem
    topics = [t.strip() for t in args.topics.split(",") if t.strip()] or [title, week]

    body = normalize(extract_pdf_text(args.pdf))
    if args.max_chars > 0 and len(body) > args.max_chars:
        body = body[: args.max_chars] + "\n\n<!-- truncated for few-shot token budget -->"

    args.out.parent.mkdir(parents=True, exist_ok=True)
    content = build_markdown(
        body=body,
        week=week,
        title=title,
        topics=topics,
        course=args.course,
        source_pdf=args.pdf.name,
    )
    args.out.write_text(content, encoding="utf-8")
    print(f"Wrote {args.out} ({len(body)} chars, week={week})")


if __name__ == "__main__":
    main()
