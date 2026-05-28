from datetime import date

from app.services.sogang_cafeteria import (
    SogangCafeteriaClient,
    shift_week,
    week_range_mon_fri,
)


def test_week_range_mon_fri():
    mon, fri = week_range_mon_fri(date(2026, 5, 28))
    assert mon == date(2026, 5, 25)
    assert fri == date(2026, 5, 29)


def test_shift_week():
    start, end = week_range_mon_fri(date(2026, 5, 28))
    prev_start, prev_end = shift_week(start, end, -1)
    assert (end - start).days == 4
    assert (prev_end - prev_start).days == 4


def test_parse_response():
    client = SogangCafeteriaClient()
    raw = {
        "data": {
            "menuList": [
                {
                    "menuDate": "2026-05-26",
                    "menuInfo": [
                        {"category": "한식", "menu": "제육볶음<br>밥"},
                        {"category": "일품", "menu": "우동"},
                    ],
                }
            ],
            "origin": "쌀,돼지고기",
        }
    }
    out = client._parse_response(raw, date(2026, 5, 26), date(2026, 5, 30))
    assert len(out.days) == 1
    assert out.days[0].weekday == "화"
    assert "제육볶음" in out.days[0].items[0].menu
    assert out.origin == "쌀,돼지고기"
