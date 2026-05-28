from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import require_database, verify_api_token
from app.repositories import categories as cat_repo
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> list[CategoryOut]:
    return cat_repo.list_categories()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    body: CategoryCreate,
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> CategoryOut:
    return cat_repo.create_category(body)


@router.patch("/{slug}", response_model=CategoryOut)
def patch_category(
    slug: str,
    body: CategoryUpdate,
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> CategoryOut:
    updated = cat_repo.update_category(slug, body)
    if not updated:
        raise HTTPException(status_code=404, detail="Category not found")
    return updated


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def remove_category(
    slug: str,
    _: None = Depends(verify_api_token),
    __: None = Depends(require_database),
) -> None:
    cat_repo.delete_category(slug)
