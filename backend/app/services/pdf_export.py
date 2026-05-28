from __future__ import annotations

import re
from html import escape

from app.services.korean_fonts import korean_font_face_css
from app.services.study_guide_styles import RINGO_STUDY_GUIDE_CSS, wrap_study_guide_html
from app.services.study_guide_text import is_html_study_guide


def _md_to_simple_html(markdown: str, title: str) -> str:
    lines = markdown.splitlines()
    html_lines: list[str] = []
    in_list = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append("<p>&nbsp;</p>")
            continue
        if stripped.startswith("### "):
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append(f"<h3>{escape(stripped[4:])}</h3>")
            continue
        if stripped.startswith("## "):
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append(f"<h2>{escape(stripped[3:])}</h2>")
            continue
        if stripped.startswith("# "):
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append(f"<h1>{escape(stripped[2:])}</h1>")
            continue
        if stripped.startswith("- [ ]") or stripped.startswith("- [x]"):
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            label = stripped[5:].strip()
            html_lines.append(f"<li>{escape(label)}</li>")
            continue
        if stripped.startswith("- "):
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            html_lines.append(f"<li>{escape(stripped[2:])}</li>")
            continue
        if in_list:
            html_lines.append("</ul>")
            in_list = False
        body = escape(stripped)
        body = re.sub(r"\$([^$]+)\$", r"<em>\1</em>", body)
        html_lines.append(f"<p>{body}</p>")

    if in_list:
        html_lines.append("</ul>")

    body_html = "\n".join(html_lines)
    return wrap_study_guide_html(body_html, title)


def _ensure_print_styles(html: str) -> str:
    """Inject Ringo print CSS + Korean webfont if the model omitted styles."""
    font_css = korean_font_face_css()
    bundle_css = RINGO_STUDY_GUIDE_CSS
    if "<head>" in html.lower():
        if "Ringo Noto KR" not in html and font_css not in html:
            html = re.sub(
                r"(<head[^>]*>)",
                rf"\1\n<style>{font_css}</style>",
                html,
                count=1,
                flags=re.IGNORECASE,
            )
        if "sg-section" in html and bundle_css[:80] not in html:
            html = re.sub(
                r"(<head[^>]*>)",
                rf"\1\n<style>{bundle_css}</style>",
                html,
                count=1,
                flags=re.IGNORECASE,
            )
        return html
    if "sg-section" in html or "ringo-study-guide" in html:
        return f"<!DOCTYPE html><html lang='ko'><head><meta charset='utf-8'/><style>{font_css}{bundle_css}</style></head><body>{html}</body></html>"
    return html


def study_guide_content_to_html(content: str, title: str = "Ringo 학습지") -> str:
    if is_html_study_guide(content):
        return _ensure_print_styles(content)
    return _md_to_simple_html(content, title)


def markdown_to_pdf_bytes(markdown: str, title: str = "Ringo 학습지") -> bytes:
    html = study_guide_content_to_html(markdown, title)
    try:
        from weasyprint import HTML
    except ImportError as exc:
        raise RuntimeError(
            "WeasyPrint is required for PDF export: pip install weasyprint"
        ) from exc
    return HTML(string=html).write_pdf()
