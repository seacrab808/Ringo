from pydantic import BaseModel, Field


class CafeteriaMenuItem(BaseModel):
    category: str = ""
    menu: str = ""


class CafeteriaDayMenu(BaseModel):
    date: str
    weekday: str
    items: list[CafeteriaMenuItem] = Field(default_factory=list)


class SogangCafeteriaWeek(BaseModel):
    hall: str = "베르크만스우정원(BW관) · 우정학식"
    config_id: int = 1
    start_date: str
    end_date: str
    origin: str = ""
    days: list[CafeteriaDayMenu] = Field(default_factory=list)
    source_url: str = "https://www.sogang.ac.kr/ko/menu-life-info"
    fetched_at: str
    cached: bool = False
    error: str | None = None
