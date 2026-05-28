from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    id: UUID
    slug: str
    label: str
    color_hex: str
    sort_order: int
    created_at: datetime


class CategoryCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9_가-힣-]+$")
    label: str = Field(min_length=1, max_length=64)
    color_hex: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=64)
    color_hex: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    sort_order: int | None = None
