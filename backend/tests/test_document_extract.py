from pathlib import Path

import pytest

from app.services.document_extract import (
    extract_text_from_document,
    is_allowed_upload,
)


def test_is_allowed_upload_by_extension():
    assert is_allowed_upload("lecture.pdf")
    assert is_allowed_upload("slides.pptx")
    assert is_allowed_upload("old.ppt")
    assert not is_allowed_upload("notes.txt")


def test_is_allowed_upload_by_mime():
    assert is_allowed_upload(
        "x.bin",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )
    assert is_allowed_upload("x.bin", "application/vnd.ms-powerpoint")


def test_extract_ppt_rejects_legacy(tmp_path: Path):
    ppt = tmp_path / "deck.ppt"
    ppt.write_bytes(b"fake")
    with pytest.raises(ValueError, match="pptx"):
        extract_text_from_document(ppt)
