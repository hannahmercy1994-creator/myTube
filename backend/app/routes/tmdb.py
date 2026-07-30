import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from .. import models
from ..models import Video, User
from ..schemas import VideoResponse
from ..routes.auth import get_current_user
from ..routes.videos import video_to_response
from ..cache import video_cache
from ..tmdb import tmdb_search, tmdb_details, format_tmdb_result, guess_tmdb, apply_tmdb_details
from ..config import settings

router = APIRouter(prefix="/api/tmdb", tags=["tmdb"])

TMDB_URL_PATTERN = re.compile(r"themoviedb\.org/(movie|tv)/(\d+)")


def get_api_key():
    return settings.tmdb_api_key


@router.get("/search")
async def search_tmdb(
    query: str = Query(..., min_length=1),
    media_type: str = Query("movie", pattern="^(movie|tv)$"),
    user: User = Depends(get_current_user),
):
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="TMDB API key not configured. Set TMDB_API_KEY in your .env file.",
        )

    m = TMDB_URL_PATTERN.search(query)
    if m:
        detected_type = m.group(1)
        tmdb_id = int(m.group(2))
        details = await tmdb_details(tmdb_id, api_key, detected_type)
        if details:
            item = format_tmdb_result({"id": tmdb_id, **details}, detected_type)
            return [item]
        return []

    results = await tmdb_search(query, api_key, media_type)
    return [format_tmdb_result(r, media_type) for r in results]


@router.post("/guess/{video_id}")
async def guess_tmdb_endpoint(
    video_id: int,
    title: str = Query(None, description="Optional custom title for TMDB search (defaults to video title)"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="TMDB API key not configured")

    search_title = title or video.title
    tmdb_id, tmdb_type, details = await guess_tmdb(search_title, api_key)
    if not tmdb_id or not details:
        raise HTTPException(status_code=404, detail="No TMDB match found for this video title")

    apply_tmdb_details(video, details, tmdb_id, tmdb_type)
    video_cache.invalidate(f"video:{user.id}:{video_id}")
    await db.flush()
    await db.refresh(video, ["category", "tags"])

    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(
            models.user_favorites.c.user_id == user.id,
            models.user_favorites.c.video_id == video_id,
        )
    )
    video._fav_cache = {row[0] for row in fav_result}
    return video_to_response(video, user)


@router.post("/link/{video_id}")
async def link_tmdb(
    video_id: int,
    tmdb_id: int = Query(...),
    tmdb_type: str = Query("movie", pattern="^(movie|tv)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    api_key = get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="TMDB API key not configured. Set TMDB_API_KEY in your .env file.",
        )

    details = await tmdb_details(tmdb_id, api_key, tmdb_type)
    if not details:
        raise HTTPException(status_code=404, detail="TMDB item not found")

    apply_tmdb_details(video, details, tmdb_id, tmdb_type)
    video_cache.invalidate(f"video:{user.id}:{video_id}")
    await db.flush()
    await db.refresh(video, ["category", "tags"])

    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(
            models.user_favorites.c.user_id == user.id,
            models.user_favorites.c.video_id == video_id,
        )
    )
    video._fav_cache = {row[0] for row in fav_result}
    return video_to_response(video, user)


@router.post("/sync")
async def sync_tmdb(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="TMDB API key not configured")

    result = await db.execute(select(Video).where(Video.tmdb_id.is_(None)))
    videos = result.scalars().all()

    matched = 0
    failed = 0
    for video in videos:
        tmdb_id, tmdb_type, details = await guess_tmdb(video.title, api_key)
        if tmdb_id and details:
            apply_tmdb_details(video, details, tmdb_id, tmdb_type)
            matched += 1
        else:
            failed += 1

    await db.flush()
    video_cache.invalidate("dashboard:")
    video_cache.invalidate("list:")
    return {"matched": matched, "failed": failed, "total": len(videos)}


@router.post("/unlink/{video_id}")
async def unlink_tmdb(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    video.tmdb_id = None
    video.tmdb_type = None
    video.tmdb_poster_url = None
    video.tmdb_backdrop_url = None
    video.tmdb_overview = None
    video.tmdb_vote_average = None
    video.tmdb_release_date = None
    video.tmdb_credits = None

    video_cache.invalidate(f"video:{user.id}:{video_id}")
    await db.flush()
    await db.refresh(video, ["category", "tags"])

    fav_result = await db.execute(
        select(models.user_favorites.c.video_id).where(
            models.user_favorites.c.user_id == user.id,
            models.user_favorites.c.video_id == video_id,
        )
    )
    video._fav_cache = {row[0] for row in fav_result}
    return video_to_response(video, user)
