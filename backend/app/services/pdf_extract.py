from __future__ import annotations

from pathlib import Path


def extract_text_from_pdf(path: Path) -> str:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("pymupdf is required: pip install pymupdf") from exc

    doc = fitz.open(path)
    parts: list[str] = []
    for page in doc:
        parts.append(page.get_text("text"))
    doc.close()
    return "\n\n".join(parts).strip()
