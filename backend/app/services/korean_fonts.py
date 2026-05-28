from __future__ import annotations

from pathlib import Path


def resolve_korean_font_file() -> Path | None:
    backend_root = Path(__file__).resolve().parents[2]
    bundled = backend_root / "assets" / "fonts" / "NotoSansKR-Regular.otf"
    if bundled.is_file():
        return bundled
    system_candidates = (
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
        "/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf",
        "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc",
    )
    for p in system_candidates:
        path = Path(p)
        if path.is_file():
            return path
    return None


def korean_font_face_css() -> str:
    font = resolve_korean_font_file()
    if not font:
        return (
            'body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; }'
        )
    uri = font.resolve().as_uri()
    return f"""
@font-face {{
  font-family: "Ringo Noto KR";
  src: url("{uri}") format("opentype");
  font-weight: normal;
  font-style: normal;
}}
body, .ringo-study-guide {{
  font-family: "Ringo Noto KR", "Noto Sans KR", "Malgun Gothic", sans-serif;
}}
"""
