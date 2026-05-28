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


def main() -> None:
    parser = argparse.ArgumentParser(description="PDF → few-shot Markdown")
    parser.add_argument("pdf", type=Path, help="Source PDF path")
    parser.add_argument("--out", type=Path, required=True, help="Output .md path")
    parser.add_argument("--title", type=str, default=None, help="Document title")
    args = parser.parse_args()

    if not args.pdf.is_file():
        raise SystemExit(f"PDF not found: {args.pdf}")

    title = args.title or args.pdf.stem
    body = normalize(extract_pdf_text(args.pdf))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    content = f"# {title}\n\n<!-- few-shot example: edit section headings to match your style -->\n\n{body}\n"
    args.out.write_text(content, encoding="utf-8")
    print(f"Wrote {args.out} ({len(body)} chars)")


if __name__ == "__main__":
    main()
