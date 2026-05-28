from pathlib import Path

from app.services.few_shot_selector import load_few_shot_catalog, select_few_shots


def test_select_by_week_number():
    root = Path(__file__).resolve().parents[1] / "data" / "study_guide_examples"
    catalog = load_few_shot_catalog(root)
    assert len(catalog) >= 5
    picked = select_few_shots("0408 RNN LSTM 강의 정리", catalog, max_examples=2)
    assert picked[0].week == "0408"
