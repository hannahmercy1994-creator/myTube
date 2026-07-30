from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..models import Collection, Video
from ..schemas import (
    CollectionCreate, CollectionUpdate, CollectionResponse,
    CollectionDetailResponse,
)
from ..routes.auth import get_current_user
from ..models import User
from ..routes.videos import video_to_response

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("", response_model=list[CollectionResponse])
async def list_collections(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Collection).order_by(Collection.name))
    collections = result.scalars().all()

    response = []
    for col in collections:
        count_result = await db.execute(
            select(func.count(Video.id))
            .select_from(Collection)
            .join(Collection.videos)
            .where(Collection.id == col.id)
        )
        video_count = count_result.scalar()
        response.append(CollectionResponse(
            id=col.id,
            name=col.name,
            description=col.description,
            created_at=col.created_at,
            video_count=video_count,
        ))

    return response


@router.post("", response_model=CollectionResponse, status_code=201)
async def create_collection(
    data: CollectionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = Collection(name=data.name, description=data.description)
    db.add(collection)
    await db.flush()
    await db.refresh(collection)

    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        created_at=collection.created_at,
        video_count=0,
    )


@router.get("/{collection_id}", response_model=CollectionDetailResponse)
async def get_collection(
    collection_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Collection)
        .options(selectinload(Collection.videos).selectinload(Video.category),
                 selectinload(Collection.videos).selectinload(Video.tags))
        .where(Collection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    return CollectionDetailResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        created_at=collection.created_at,
        video_count=len(collection.videos),
        videos=[video_to_response(v, None) for v in collection.videos],
    )


@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: int,
    data: CollectionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = await db.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    if data.name is not None:
        collection.name = data.name
    if data.description is not None:
        collection.description = data.description

    await db.flush()
    await db.refresh(collection)

    count_result = await db.execute(
        select(func.count(Video.id))
        .select_from(Collection)
        .join(Collection.videos)
        .where(Collection.id == collection.id)
    )

    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        created_at=collection.created_at,
        video_count=count_result.scalar(),
    )


@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = await db.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    await db.delete(collection)
    await db.flush()
    return {"message": "Collection deleted"}


@router.post("/{collection_id}/videos/{video_id}")
async def add_video_to_collection(
    collection_id: int,
    video_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = await db.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video not in collection.videos:
        collection.videos.append(video)
        await db.flush()

    return {"message": "Video added to collection"}


@router.delete("/{collection_id}/videos/{video_id}")
async def remove_video_from_collection(
    collection_id: int,
    video_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = await db.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video in collection.videos:
        collection.videos.remove(video)
        await db.flush()

    return {"message": "Video removed from collection"}
