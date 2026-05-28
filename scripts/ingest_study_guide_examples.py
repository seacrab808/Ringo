#!/usr/bin/env python3
"""
Ingest reference study-guide PDFs into backend/data/study_guide_examples/.

Copy PDFs into backend/data/study_guide_import/ (see README there), then:

  cd Ringo
  python scripts/ingest_study_guide_examples.py

From Windows (paths with spaces), copy files manually or:

  python scripts/ingest_study_guide_examples.py --pdf-dir "D:/path/to/pdfs"
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

RINGO_ROOT = Path(__file__).resolve().parents[1]
BACKEND = RINGO_ROOT / "backend"
DEFAULT_IMPORT = BACKEND / "data" / "study_guide_import"
DEFAULT_OUT = BACKEND / "data" / "study_guide_examples"
PDF_SCRIPT = RINGO_ROOT / "scripts" / "pdf_to_few_shot.py"


@dataclass(frozen=True)
class StudyGuideSource:
    filename: str
    out_name: str
    week: str
    title: str
    topics: tuple[str, ...]
    course: str
    max_chars: int = 14_000


# User-provided reference library (고성능 딥러닝 + CME 295)
MANIFEST: tuple[StudyGuideSource, ...] = (
    StudyGuideSource(
        "0304 학습지.pdf",
        "0304.md",
        "0304",
        "신경망 기초와 역전파",
        ("퍼셉트론", "다층신경망", "역전파", "활성화함수", "손실함수", "MLP"),
        "고성능 딥러닝",
    ),
    StudyGuideSource(
        "0318 학습지.pdf",
        "0318.md",
        "0318",
        "최적화와 정규화",
        ("SGD", "Adam", "배치정규화", "드롭아웃", "가중치감쇠", "학습률"),
        "고성능 딥러닝",
    ),
    StudyGuideSource(
        "0401 학습지.pdf",
        "0401.md",
        "0401",
        "CNN과 시각 표현",
        ("합성곱", "풀링", "CNN", "수용역", "이미지분류", "ResNet"),
        "고성능 딥러닝",
    ),
    StudyGuideSource(
        "0408 학습지.pdf",
        "0408.md",
        "0408",
        "RNN과 시퀀스 모델",
        ("RNN", "LSTM", "GRU", "BPTT", "시퀀스", "기울기소실"),
        "고성능 딥러닝",
    ),
    StudyGuideSource(
        "0415 학습지.pdf",
        "0415.md",
        "0415",
        "Attention과 Transformer 입문",
        ("어텐션", "Transformer", "self-attention", "멀티헤드", "위치인코딩"),
        "고성능 딥러닝",
    ),
    StudyGuideSource(
        "CME 295 Transformers 및 LLM 상세 학습 가이드.pdf",
        "cme295_transformers_llm.md",
        "ref-cme295",
        "Transformers 및 LLM 상세 학습 가이드",
        (
            "Transformer",
            "LLM",
            "Attention",
            "self-attention",
            "멀티헤드",
            "GPT",
            "BERT",
            "상세학습지",
        ),
        "딥러닝 CME 295",
        max_chars=16_000,
    ),
    StudyGuideSource(
        "Position Embeddings 및 Layer Normalization 수식 정리 학습 자료.pdf",
        "position_embeddings_layernorm.md",
        "ref-pe-ln",
        "Position Embeddings 및 Layer Normalization 수식 정리",
        (
            "Position Embedding",
            "Sinusoidal",
            "Learned PE",
            "Layer Normalization",
            "RMSNorm",
            "수식유도",
            "수식정리",
        ),
        "딥러닝 CME 295",
        max_chars=16_000,
    ),
)


def run_one(pdf: Path, out: Path, src: StudyGuideSource) -> bool:
    cmd = [
        sys.executable,
        str(PDF_SCRIPT),
        str(pdf),
        "--out",
        str(out),
        "--week",
        src.week,
        "--title",
        src.title,
        "--topics",
        ",".join(src.topics),
        "--course",
        src.course,
        "--max-chars",
        str(src.max_chars),
    ]
    subprocess.run(cmd, check=True)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest study-guide PDFs → few-shot .md")
    parser.add_argument(
        "--pdf-dir",
        type=Path,
        default=DEFAULT_IMPORT,
        help="Directory containing reference PDFs",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT,
        help="Output few-shot directory",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    pdf_dir: Path = args.pdf_dir
    out_dir: Path = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    ok, missing = 0, 0
    for src in MANIFEST:
        pdf = pdf_dir / src.filename
        out = out_dir / src.out_name
        if not pdf.is_file():
            print(f"SKIP (missing): {src.filename}")
            missing += 1
            continue
        if args.dry_run:
            print(f"WOULD: {pdf.name} → {out.name}")
            ok += 1
            continue
        print(f"INGEST: {pdf.name} → {out.name}")
        run_one(pdf, out, src)
        ok += 1

    print(f"\nDone: {ok} processed, {missing} missing.")
    if missing:
        print(f"Place PDFs in: {pdf_dir.resolve()}")
        print("See backend/data/study_guide_import/README.md")


if __name__ == "__main__":
    main()
