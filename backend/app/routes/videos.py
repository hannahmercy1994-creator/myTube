import os
import re
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, asc, and_, text
from sqlalchemy.orm import selectinload
from ..database import get_db
from .. import models
from ..models import Video, Category, Tag, Collection, video_tags
from ..schemas import (
    VideoCreate, VideoUpdate, VideoResponse, VideoProgressUpdate,
    PaginatedResponse, ImportResult, BackupData,
)
from ..routes.auth import get_current_user
from ..models import User
from ..tmdb import guess_tmdb, apply_tmdb_details, tmdb_details
from ..config import settings
from ..cache import video_cache

router = APIRouter(prefix="/api/videos", tags=["videos"])

YOUTUBE_ID_PATTERN = re.compile(
    r"(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})"
)


def extract_youtube_id(url: str) -> Optional[str]:
    match = YOUTUBE_ID_PATTERN.search(url)
    return match.group(1) if match else None


def get_thumbnail_url(youtube_id: str) -> str:
    return f"https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg"


async def get_video_with_relations(db: AsyncSession, video_id: int) -> Optional[Video]:
    result = await db.execute(
        select(Video)
        .options(selectinload(Video.category), selectinload(Video.tags))
        .where(Video.id == video_id)
    )
    return result.scalar_one_or_none()


def is_favorited(video, user_id: int, fav_cache: set | None = None):
    if fav_cache is not None:
        return video.id in fav_cache
    return False


def in_watchlist(video, user_id: int, wl_cache: set | None = None):
    if wl_cache is not None:
        return video.id in wl_cache
    return False


def video_to_response(video: Video, user=None) -> dict:
    user_id = user.id if user else None
    fav_cache = getattr(video, "_fav_cache", None)
    wl_cache = getattr(video, "_wl_cache", None)
    return {
        "id": video.id,
        "title": video.title,
        "youtube_url": video.youtube_url,
        "youtube_id": video.youtube_id,
        "description": video.description,
        "category_id": video.category_id,
        "thumbnail_url": video.thumbnail_override or video.tmdb_backdrop_url or video.thumbnail_url,
        "thumbnail_override": video.thumbnail_override,
        "is_favorite": is_favorited(video, user_id, fav_cache) if user_id else False,
        "in_watchlist": in_watchlist(video, user_id, wl_cache) if user_id else False,
        "hidden": video.hidden,
        "watched": video.watched,
        "rating": video.rating,
        "notes": video.notes,
        "watch_count": video.watch_count,
        "watch_progress": video.watch_progress,
        "last_watched": video.last_watched.isoformat() if video.last_watched else None,
        "created_at": video.created_at.isoformat() if video.created_at else None,
        "updated_at": video.updated_at.isoformat() if video.updated_at else None,
        "category": {
            "id": video.category.id,
            "name": video.category.name,
            "slug": video.category.slug,
            "created_at": video.category.created_at.isoformat() if video.category.created_at else None,
            "video_count": 0,
        } if video.category else None,
        "tags": [{"id": t.id, "name": t.name} for t in video.tags],
        "backdrop_url": video.tmdb_backdrop_url or video.thumbnail_url,
        "tmdb_id": video.tmdb_id,
        "tmdb_type": video.tmdb_type,
        "tmdb_poster_url": video.tmdb_poster_url,
        "tmdb_backdrop_url": video.tmdb_backdrop_url,
        "tmdb_overview": video.tmdb_overview,
        "tmdb_vote_average": video.tmdb_vote_average,
        "tmdb_release_date": video.tmdb_release_date,
        "tmdb_credits": json.loads(video.tmdb_credits) if video.tmdb_credits else None,
        "tmdb_collection": video.tmdb_collection,
    }


@router.get("", response_model=PaginatedResponse)
async def list_videos(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    collection: Optional[int] = Query(None),
    genre: Optional[str] = Query(None),
    collection_name: Optional[str] = Query(None),
    cast_name: Optional[str] = Query(None, alias="cast"),
    sort: Optional[str] = Query(None),
    favorite: Optional[bool] = Query(None),
    watchlist: Optional[bool] = Query(None),
    hidden: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cache_key = f"list:{user.id}:{search}:{category}:{collection}:{genre}:{collection_name}:{cast_name}:{sort}:{favorite}:{watchlist}:{hidden}:{page}:{per_page}"
    cached = video_cache.get(cache_key)
    if cached:
        return cached
    query = select(Video).options(selectinload(Video.category), selectinload(Video.tags))

    if not user.is_admin:
        query = query.where(Video.hidden != True)

    if search:
        search_filter = or_(
            Video.title.ilike(f"%{search}%"),
            Video.description.ilike(f"%{search}%"),
            Video.tags.any(Tag.name.ilike(f"%{search}%")),
        )
        query = query.where(search_filter)

    if category:
        query = query.join(Video.category).where(Category.slug == category)

    if collection:
        query = query.join(Video.collections).where(Collection.id == collection)

    if genre:
        query = query.where(Video.tmdb_credits.contains(f'"{genre}"'))

    if collection_name:
        query = query.where(Video.tmdb_collection == collection_name)

    if cast_name:
        old_style = json.dumps(cast_name, ensure_ascii=True)[1:-1]
        if old_style != cast_name:
            query = query.where(or_(
                Video.tmdb_credits.contains(f'"{cast_name}"'),
                Video.tmdb_credits.contains(f'"{old_style}"'),
            ))
        else:
            query = query.where(Video.tmdb_credits.contains(f'"{cast_name}"'))

    if favorite is not None:
        query = query.where(Video.favorited_by.any(User.id == user.id))

    if watchlist is not None:
        query = query.where(Video.watchlisted_by.any(User.id == user.id))

    if hidden is not None:
        if not user.is_admin:
            raise HTTPException(status_code=403, detail="Admin only")
        query = query.where(Video.hidden == (1 if hidden else 0))

    sort_map = {
        "recent": desc(Video.created_at),
        "oldest": asc(Video.created_at),
        "most_watched": desc(Video.watch_count),
        "alphabetical": asc(Video.title),
        "recently_watched": desc(Video.last_watched),
        "tmdb_recent": desc(Video.tmdb_release_date),
    }
    order = sort_map.get(sort, desc(Video.created_at))
    query = query.order_by(order)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    pages = max(1, (total + per_page - 1) // per_page)
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    videos = result.scalars().all()

    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(models.user_favorites.c.user_id == user.id)
    )
    fav_ids = {row[0] for row in fav_result}
    wl_result = await db.execute(
        select(models.user_watchlist.c.video_id).where(models.user_watchlist.c.user_id == user.id)
    )
    wl_ids = {row[0] for row in wl_result}
    for v in videos:
        v._fav_cache = fav_ids
        v._wl_cache = wl_ids

    result = PaginatedResponse(
        items=[video_to_response(v, user) for v in videos],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )
    video_cache.set(cache_key, result)
    return result


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    async def count(model):
        result = await db.execute(select(func.count(model.id)))
        return result.scalar()

    return {
        "total_videos": await count(Video),
        "total_categories": await count(Category),
        "total_collections": await count(Collection),
        "total_watched": await db.execute(select(func.count(Video.id)).where(Video.watched == True)).scalar(),
        "total_favorites": await db.execute(select(func.count(models.user_favorites.c.video_id)).select_from(models.user_favorites)).scalar(),
    }


@router.get("/featured")
async def get_featured(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    base = select(Video).options(selectinload(Video.category), selectinload(Video.tags)).where(
        Video.tmdb_backdrop_url.isnot(None),
        Video.tmdb_backdrop_url != "",
        Video.tmdb_overview.isnot(None),
        Video.tmdb_overview != "",
    )
    base = base.where(Video.hidden != True)
    result = await db.execute(base.order_by(func.random()).limit(6))
    videos = result.scalars().all()
    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(models.user_favorites.c.user_id == user.id)
    )
    fav_ids = {row[0] for row in fav_result}
    wl_result = await db.execute(
        select(models.user_watchlist.c.video_id).where(models.user_watchlist.c.user_id == user.id)
    )
    wl_ids = {row[0] for row in wl_result}
    for v in videos:
        v._fav_cache = fav_ids
        v._wl_cache = wl_ids
    return [video_to_response(v, user) for v in videos]


@router.get("/dashboard")
async def get_dashboard(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    cached = video_cache.get(f"dashboard:{user.id}")
    if cached:
        return cached
    base_query = select(Video).options(selectinload(Video.category), selectinload(Video.tags))
    if not user.is_admin:
        base_query = base_query.where(Video.hidden != True)

    recently_added = await db.execute(
        base_query.order_by(desc(Video.created_at)).limit(20)
    )
    continue_watching = await db.execute(
        base_query.where(
            Video.watch_progress > 0,
            Video.watch_progress < 100,
        ).order_by(desc(Video.last_watched)).limit(20)
    )
    favorites = await db.execute(
        base_query.where(Video.favorited_by.any(User.id == user.id)).order_by(desc(Video.created_at)).limit(20)
    )
    trending = await db.execute(
        base_query.order_by(desc(Video.watch_count)).limit(20)
    )

    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(models.user_favorites.c.user_id == user.id)
    )
    fav_ids = {row[0] for row in fav_result}
    wl_result = await db.execute(
        select(models.user_watchlist.c.video_id).where(models.user_watchlist.c.user_id == user.id)
    )
    wl_ids = {row[0] for row in wl_result}

    def with_fav(videos_list):
        result = []
        for v in videos_list:
            v._fav_cache = fav_ids
            v._wl_cache = wl_ids
            result.append(video_to_response(v, user))
        return result

    categories_result = await db.execute(select(Category))
    categories = categories_result.scalars().all()

    dashboard_categories = []
    for cat in categories:
        cat_videos = await db.execute(
            base_query.where(Video.category_id == cat.id).order_by(desc(Video.created_at)).limit(20)
        )
        cat_videos_list = cat_videos.scalars().all()
        if cat_videos_list:
            dashboard_categories.append({
                "category": {"id": cat.id, "name": cat.name, "slug": cat.slug},
                "videos": with_fav(cat_videos_list),
            })

    result = {
        "recently_added": with_fav(recently_added.scalars().all()),
        "continue_watching": with_fav(continue_watching.scalars().all()),
        "favorites": with_fav(favorites.scalars().all()),
        "trending": with_fav(trending.scalars().all()),
        "categories": dashboard_categories,
    }
    video_cache.set(f"dashboard:{user.id}", result)
    return result


@router.get("/genres")
async def list_genres(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Video.tmdb_credits).where(Video.tmdb_credits.isnot(None)))
    genre_set = set()
    for (row,) in result:
        try:
            credits = json.loads(row)
            for g in credits.get("genres") or []:
                genre_set.add(g)
        except Exception:
            pass
    return sorted(genre_set)


@router.get("/collections")
async def list_collections(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Video.tmdb_collection)
        .where(Video.tmdb_collection.isnot(None))
        .distinct()
        .order_by(Video.tmdb_collection)
    )
    return [row[0] for row in result]


@router.get("/tmdb-collections")
async def list_tmdb_collections(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    hidden_clause = "" if user.is_admin else "AND hidden != 1"
    result = await db.execute(text(f"""
        SELECT tmdb_collection, COUNT(*) as video_count,
               GROUP_CONCAT(tmdb_poster_url) as poster_urls,
               MAX(tmdb_backdrop_url) as backdrop_url
        FROM videos
        WHERE tmdb_collection IS NOT NULL AND tmdb_collection != ''
          AND tmdb_poster_url IS NOT NULL AND tmdb_poster_url != ''
          {hidden_clause}
        GROUP BY tmdb_collection
        HAVING COUNT(*) > 1
        ORDER BY tmdb_collection
    """))
    return [
        {
            "name": row[0],
            "video_count": row[1],
            "poster_urls": row[2].split(",") if row[2] else [],
            "backdrop_url": row[3],
        }
        for row in result
    ]


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cache_key = f"video:{user.id}:{video_id}"
    cached = video_cache.get(cache_key)
    if cached:
        return cached

    video = await get_video_with_relations(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.hidden and not user.is_admin:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.tmdb_id and not video.tmdb_credits and settings.tmdb_api_key:
        try:
            from ..tmdb import tmdb_details, apply_tmdb_details
            details = await tmdb_details(video.tmdb_id, settings.tmdb_api_key, video.tmdb_type or "movie")
            if details:
                apply_tmdb_details(video, details, video.tmdb_id, video.tmdb_type or "movie")
                await db.flush()
        except Exception:
            pass
    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(
            models.user_favorites.c.user_id == user.id,
            models.user_favorites.c.video_id == video_id,
        )
    )
    video._fav_cache = {row[0] for row in fav_result}
    wl_result = await db.execute(
        select(models.user_watchlist.c.video_id).where(
            models.user_watchlist.c.user_id == user.id,
            models.user_watchlist.c.video_id == video_id,
        )
    )
    video._wl_cache = {row[0] for row in wl_result}
    response = video_to_response(video, user)
    video_cache.set(cache_key, response)
    return response


@router.post("", response_model=VideoResponse, status_code=201)
async def create_video(
    data: VideoCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    youtube_id = extract_youtube_id(data.youtube_url)
    if not youtube_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    existing = await db.execute(select(Video).where(Video.youtube_id == youtube_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A video with this YouTube URL already exists")

    thumbnail = data.thumbnail_url or get_thumbnail_url(youtube_id)

    video = Video(
        title=data.title,
        youtube_url=data.youtube_url,
        youtube_id=youtube_id,
        description=data.description,
        category_id=data.category_id,
        thumbnail_url=thumbnail,
        thumbnail_override=data.thumbnail_override,
        hidden=data.hidden,
        watched=data.watched,
        rating=data.rating,
        notes=data.notes,
        tmdb_id=data.tmdb_id,
        tmdb_type=data.tmdb_type,
        tmdb_poster_url=data.tmdb_poster_url,
        tmdb_backdrop_url=data.tmdb_backdrop_url,
        tmdb_overview=data.tmdb_overview,
        tmdb_vote_average=data.tmdb_vote_average,
        tmdb_release_date=data.tmdb_release_date,
        tmdb_collection=data.tmdb_collection,
    )

    if data.tags:
        for tag_name in data.tags:
            result = await db.execute(select(Tag).where(Tag.name == tag_name.strip()))
            tag = result.scalar_one_or_none()
            if not tag:
                tag = Tag(name=tag_name.strip())
                db.add(tag)
                await db.flush()
            video.tags.append(tag)

    db.add(video)
    await db.flush()
    await db.refresh(video, ["category", "tags"])

    if settings.tmdb_api_key:
        if data.tmdb_id:
            try:
                details = await tmdb_details(data.tmdb_id, settings.tmdb_api_key, data.tmdb_type or "movie")
                if details:
                    apply_tmdb_details(video, details, data.tmdb_id, data.tmdb_type or "movie")
                    await db.flush()
            except Exception:
                pass
        else:
            try:
                tmdb_id, tmdb_type, details = await guess_tmdb(data.title, settings.tmdb_api_key)
                if tmdb_id and details:
                    apply_tmdb_details(video, details, tmdb_id, tmdb_type)
                    await db.flush()
                    await db.refresh(video, ["category", "tags"])
            except Exception:
                pass

    if data.is_favorite:
        await db.execute(
            models.user_favorites.insert().values(user_id=user.id, video_id=video.id)
            .prefix_with("OR IGNORE")
        )
        await db.flush()

    video._fav_cache = {video.id} if data.is_favorite else set()
    video._wl_cache = set()
    video_cache.invalidate("dashboard:")
    video_cache.invalidate("list:")
    return video_to_response(video, user)


@router.post("/{video_id}/favorite")
async def toggle_favorite(
    video_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    desired = data.get("is_favorite", True)
    if desired:
        await db.execute(
            models.user_favorites.insert().values(user_id=user.id, video_id=video_id)
            .prefix_with("OR IGNORE")
        )
    else:
        await db.execute(
            models.user_favorites.delete().where(
                models.user_favorites.c.user_id == user.id,
                models.user_favorites.c.video_id == video_id,
            )
        )
    await db.flush()

    video_cache.invalidate(f"video:{user.id}:{video_id}")
    video_cache.invalidate("list:")
    video_cache.invalidate("dashboard:")

    video = await get_video_with_relations(db, video_id)
    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(
            models.user_favorites.c.user_id == user.id,
            models.user_favorites.c.video_id == video_id,
        )
    )
    video._fav_cache = {row[0] for row in fav_result}
    wl_result = await db.execute(
        select(models.user_watchlist.c.video_id).where(
            models.user_watchlist.c.user_id == user.id,
            models.user_watchlist.c.video_id == video_id,
        )
    )
    video._wl_cache = {row[0] for row in wl_result}
    return video_to_response(video, user)


@router.post("/{video_id}/watchlist")
async def toggle_watchlist(
    video_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    desired = data.get("in_watchlist", True)
    if desired:
        await db.execute(
            models.user_watchlist.insert().values(user_id=user.id, video_id=video_id)
            .prefix_with("OR IGNORE")
        )
    else:
        await db.execute(
            models.user_watchlist.delete().where(
                models.user_watchlist.c.user_id == user.id,
                models.user_watchlist.c.video_id == video_id,
            )
        )
    await db.flush()

    video_cache.invalidate(f"video:{user.id}:{video_id}")
    video_cache.invalidate("list:")
    video_cache.invalidate("dashboard:")

    video = await get_video_with_relations(db, video_id)
    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(
            models.user_favorites.c.user_id == user.id,
            models.user_favorites.c.video_id == video_id,
        )
    )
    video._fav_cache = {row[0] for row in fav_result}
    wl_result = await db.execute(
        select(models.user_watchlist.c.video_id).where(
            models.user_watchlist.c.user_id == user.id,
            models.user_watchlist.c.video_id == video_id,
        )
    )
    video._wl_cache = {row[0] for row in wl_result}
    return video_to_response(video, user)


@router.put("/{video_id}", response_model=VideoResponse)
async def update_video(
    video_id: int,
    data: VideoUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await get_video_with_relations(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    update_data = data.model_dump(exclude_unset=True, exclude={"tags"})

    if "youtube_url" in update_data and update_data["youtube_url"]:
        yt_id = extract_youtube_id(update_data["youtube_url"])
        if not yt_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        existing = await db.execute(
            select(Video).where(Video.youtube_id == yt_id, Video.id != video_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A video with this YouTube URL already exists")
        update_data["youtube_id"] = yt_id
        if "thumbnail_url" not in update_data or not update_data.get("thumbnail_url"):
            update_data["thumbnail_url"] = get_thumbnail_url(yt_id)

    is_fav_update = "is_favorite" in update_data
    fav_val = update_data.pop("is_favorite", None)

    for key, value in update_data.items():
        setattr(video, key, value)

    if is_fav_update:
        if fav_val:
            await db.execute(
                models.user_favorites.insert().values(user_id=user.id, video_id=video_id)
                .prefix_with("OR IGNORE")
            )
        else:
            await db.execute(
                models.user_favorites.delete().where(
                    models.user_favorites.c.user_id == user.id,
                    models.user_favorites.c.video_id == video_id,
                )
            )

    is_wl_update = "in_watchlist" in update_data
    wl_val = update_data.pop("in_watchlist", None)

    if is_wl_update:
        if wl_val:
            await db.execute(
                models.user_watchlist.insert().values(user_id=user.id, video_id=video_id)
                .prefix_with("OR IGNORE")
            )
        else:
            await db.execute(
                models.user_watchlist.delete().where(
                    models.user_watchlist.c.user_id == user.id,
                    models.user_watchlist.c.video_id == video_id,
                )
            )

    if data.tags is not None:
        video.tags.clear()
        for tag_name in data.tags:
            result = await db.execute(select(Tag).where(Tag.name == tag_name.strip()))
            tag = result.scalar_one_or_none()
            if not tag:
                tag = Tag(name=tag_name.strip())
                db.add(tag)
                await db.flush()
            video.tags.append(tag)

    video.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(video, ["category", "tags"])

    video_cache.invalidate(f"video:{user.id}:{video_id}")
    video_cache.invalidate("dashboard:")
    video_cache.invalidate("list:")

    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(
            models.user_favorites.c.user_id == user.id,
            models.user_favorites.c.video_id == video_id,
        )
    )
    video._fav_cache = {row[0] for row in fav_result}
    wl_result = await db.execute(
        select(models.user_watchlist.c.video_id).where(
            models.user_watchlist.c.user_id == user.id,
            models.user_watchlist.c.video_id == video_id,
        )
    )
    video._wl_cache = {row[0] for row in wl_result}
    return video_to_response(video, user)


@router.delete("/{video_id}")
async def delete_video(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    video_cache.invalidate(f"video:{user.id}:{video_id}")
    video_cache.invalidate("dashboard:")
    video_cache.invalidate("list:")
    await db.delete(video)
    await db.flush()
    return {"message": "Video deleted"}


@router.post("/{video_id}/toggle-hidden")
async def toggle_hidden(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    video.hidden = not video.hidden
    await db.flush()
    video_cache.invalidate(f"video:{user.id}:{video_id}")
    video_cache.invalidate("dashboard:")
    video_cache.invalidate("list:")
    return {"hidden": video.hidden}


@router.patch("/{video_id}/progress", response_model=VideoResponse)
async def update_progress(
    video_id: int,
    data: VideoProgressUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await get_video_with_relations(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    video.watch_progress = data.progress
    video.last_watched = datetime.now(timezone.utc)
    video.watch_count += 1
    if data.progress >= 95:
        video.watched = True

    await db.flush()
    await db.refresh(video, ["category", "tags"])

    video_cache.invalidate(f"video:{user.id}:{video_id}")
    return video_to_response(video)


@router.post("/import", response_model=ImportResult)
async def import_videos(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = await file.read()
    data = json.loads(content)
    if isinstance(data, dict):
        data = data.get("videos", [])

    imported = 0
    errors = []

    for item in data:
        try:
            youtube_id = extract_youtube_id(item.get("youtube_url", ""))
            if not youtube_id:
                errors.append(f"Invalid URL: {item.get('youtube_url', '')}")
                continue

            dup = await db.execute(select(Video).where(Video.youtube_id == youtube_id))
            if dup.scalar_one_or_none():
                errors.append(f"Duplicate: {item.get('title', 'Untitled')} ({item.get('youtube_url', '')})")
                continue

            category = None
            if item.get("category"):
                result = await db.execute(select(Category).where(Category.slug == item["category"].lower().replace(" ", "-")))
                category = result.scalar_one_or_none()
                if not category:
                    category = Category(name=item["category"], slug=item["category"].lower().replace(" ", "-"))
                    db.add(category)
                    await db.flush()

            thumbnail = item.get("thumbnail_url") or get_thumbnail_url(youtube_id)

            video = Video(
                title=item.get("title", "Untitled"),
                youtube_url=item.get("youtube_url", ""),
                youtube_id=youtube_id,
                description=item.get("description"),
                category_id=category.id if category else None,
                thumbnail_url=thumbnail,
                watched=item.get("watched", False),
                rating=item.get("rating"),
                notes=item.get("notes"),
            )
            db.add(video)
            imported += 1
        except Exception as e:
            errors.append(str(e))

    await db.flush()
    video_cache.invalidate("dashboard:")
    video_cache.invalidate("list:")
    return ImportResult(imported=imported, errors=errors)


@router.post("/import-csv", response_model=ImportResult)
async def import_videos_csv(
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    raw = data.get("csv", "")
    guess = data.get("guess_tmdb", True)
    imported = 0
    errors = []
    lines = raw.strip().split("\n")

    for line in lines:
        line = line.strip()
        if not line or line.startswith("Video Title") or line.startswith("Title"):
            continue
        parts = line.split(",", 1)
        if len(parts) < 2:
            continue
        title = parts[0].strip()
        url = parts[1].strip()
        youtube_id = extract_youtube_id(url)
        if not youtube_id:
            errors.append(f"Invalid URL: {url}")
            continue

        dup = await db.execute(select(Video).where(Video.youtube_id == youtube_id))
        if dup.scalar_one_or_none():
            errors.append(f"Duplicate: {title}")
            continue

        video = Video(
            title=title,
            youtube_url=url,
            youtube_id=youtube_id,
            thumbnail_url=get_thumbnail_url(youtube_id),
        )
        db.add(video)
        await db.flush()

        if guess and settings.tmdb_api_key:
            try:
                tid, ttype, details = await guess_tmdb(title, settings.tmdb_api_key)
                if tid and details:
                    apply_tmdb_details(video, details, tid, ttype)
                    await db.flush()
            except Exception:
                pass

        imported += 1

    await db.commit()
    video_cache.invalidate("dashboard:")
    video_cache.invalidate("list:")
    return ImportResult(imported=imported, errors=errors)


@router.get("/export/json")
async def export_videos(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Video).options(selectinload(Video.category), selectinload(Video.tags)))
    videos = result.scalars().all()

    data = []
    for v in videos:
        data.append({
            "title": v.title,
            "youtube_url": v.youtube_url,
            "description": v.description,
            "category": v.category.name if v.category else None,
            "tags": [t.name for t in v.tags],
            "watched": v.watched,
            "rating": v.rating,
            "notes": v.notes,
        })

    return {"videos": data}


@router.post("/{video_id}/thumbnail")
async def upload_thumbnail(
    video_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    filename = f"thumb_{video_id}_{uuid.uuid4().hex[:8]}{ext}"
    os.makedirs("uploads", exist_ok=True)
    content = await file.read()
    with open(f"uploads/{filename}", "wb") as f:
        f.write(content)

    video.thumbnail_override = f"/uploads/{filename}"
    video_cache.invalidate(f"video:{user.id}:{video_id}")
    video_cache.invalidate("list:")
    video_cache.invalidate("dashboard:")
    await db.flush()
    return {"thumbnail_url": video.thumbnail_override}
