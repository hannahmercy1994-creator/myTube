from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..models import Category, Video
from ..schemas import CategoryCreate, CategoryResponse
from ..routes.auth import get_current_user
from ..models import User

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).order_by(Category.name)
    )
    categories = result.scalars().all()

    response = []
    for cat in categories:
        count_result = await db.execute(
            select(func.count(Video.id)).where(Video.category_id == cat.id)
        )
        video_count = count_result.scalar()
        response.append(CategoryResponse(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            created_at=cat.created_at,
            video_count=video_count,
        ))

    return response


@router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    slug = data.name.lower().replace(" ", "-")
    existing = await db.execute(select(Category).where(Category.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category already exists")

    category = Category(name=data.name, slug=slug)
    db.add(category)
    await db.flush()
    await db.refresh(category)

    return CategoryResponse(
        id=category.id,
        name=category.name,
        slug=category.slug,
        created_at=category.created_at,
        video_count=0,
    )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    slug = data.name.lower().replace(" ", "-")
    existing = await db.execute(
        select(Category).where(Category.slug == slug, Category.id != category_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already in use")

    category.name = data.name
    category.slug = slug
    await db.flush()
    await db.refresh(category)

    count_result = await db.execute(
        select(func.count(Video.id)).where(Video.category_id == category.id)
    )

    return CategoryResponse(
        id=category.id,
        name=category.name,
        slug=category.slug,
        created_at=category.created_at,
        video_count=count_result.scalar(),
    )


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)
    await db.flush()
    return {"message": "Category deleted"}
