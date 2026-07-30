import re
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Video, User
from ..routes.auth import get_current_user
from ..routes.videos import video_to_response, extract_youtube_id, get_thumbnail_url
from ..cache import video_cache
from ..config import settings

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

CHANNEL_HANDLE_RE = re.compile(r"(?:youtube\.com\/@|@)([a-zA-Z0-9_-]+)")
CHANNEL_ID_RE = re.compile(r"UC[a-zA-Z0-9_-]{22}")
CHANNEL_URL_RE = re.compile(r"youtube\.com\/@([a-zA-Z0-9_-]+)")


@router.post("/import-channel")
async def import_channel(
    channel_url: str = Query(..., description="YouTube channel URL or handle (e.g. @handle)"),
    max_results: int = Query(50, ge=1, le=200),
    guess_tmdb: bool = Query(True, description="Auto-match TMDB metadata for imported videos"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    api_key = settings.youtube_api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="YouTube API key not configured. Set YOUTUBE_API_KEY in your .env file.")

    channel_id = _resolve_channel_id(channel_url, api_key)

    upload_playlist_id = await _get_upload_playlist(channel_id, api_key)
    if not upload_playlist_id:
        raise HTTPException(status_code=404, detail="Could not find upload playlist for this channel")

    items = await _get_playlist_items(upload_playlist_id, api_key, max_results)

    imported = 0
    skipped = 0
    errors = []

    for item in items:
        for attempt in range(3):
            try:
                snippet = item.get("snippet", {})
                resource = snippet.get("resourceId", {})
                video_id = resource.get("videoId")
                if not video_id:
                    break

                dup = await db.execute(select(Video).where(Video.youtube_id == video_id))
                if dup.scalar_one_or_none():
                    skipped += 1
                    break

                title = snippet.get("title", "Untitled")
                description = snippet.get("description", "")
                thumbnails = snippet.get("thumbnails", {})
                thumb = thumbnails.get("maxres", thumbnails.get("high", thumbnails.get("medium", {}))).get("url", "")
                youtube_url = f"https://www.youtube.com/watch?v={video_id}"

                video = Video(
                    title=title,
                    youtube_url=youtube_url,
                    youtube_id=video_id,
                    description=description,
                    thumbnail_url=thumb or get_thumbnail_url(video_id),
                )
                db.add(video)
                await db.flush()

                if guess_tmdb and settings.tmdb_api_key:
                    try:
                        from ..tmdb import guess_tmdb as tmdb_guess, apply_tmdb_details
                        tid, ttype, details = await tmdb_guess(title, settings.tmdb_api_key)
                        if tid and details:
                            apply_tmdb_details(video, details, tid, ttype)
                            await db.flush()
                    except Exception:
                        pass

                await db.commit()
                imported += 1
                break
            except Exception as e:
                await db.rollback()
                if attempt < 2:
                    import asyncio
                    await asyncio.sleep(1)
                    continue
                errors.append(f"[{item.get('snippet',{}).get('title','?')[:40]}...] {str(e)[:120]}")

    video_cache.invalidate("dashboard:")
    video_cache.invalidate("list:")
    return {"imported": imported, "skipped": skipped, "errors": errors, "total_found": len(items)}


def _resolve_channel_id(channel_url: str, api_key: str) -> str:
    match = CHANNEL_ID_RE.search(channel_url)
    if match:
        return match.group(0)
    handle_match = CHANNEL_HANDLE_RE.search(channel_url)
    if handle_match:
        handle = handle_match.group(1)
        import httpx
        with httpx.Client(timeout=10) as c:
            r = c.get("https://www.googleapis.com/youtube/v3/channels", params={
                "part": "id",
                "forHandle": f"@{handle}",
                "key": api_key,
            })
            data = r.json()
            items = data.get("items", [])
            if items:
                return items[0]["id"]
    raise HTTPException(status_code=404, detail="Could not resolve channel ID from the provided URL")


async def _get_upload_playlist(channel_id: str, api_key: str) -> str | None:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get("https://www.googleapis.com/youtube/v3/channels", params={
            "part": "contentDetails",
            "id": channel_id,
            "key": api_key,
        })
        data = r.json()
        items = data.get("items", [])
        if items:
            return items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
    return None


async def _get_playlist_items(playlist_id: str, api_key: str, max_results: int) -> list:
    items = []
    page_token = ""
    async with httpx.AsyncClient(timeout=10) as c:
        while len(items) < max_results:
            params = {
                "part": "snippet",
                "playlistId": playlist_id,
                "key": api_key,
                "maxResults": min(50, max_results - len(items)),
            }
            if page_token:
                params["pageToken"] = page_token
            r = await c.get("https://www.googleapis.com/youtube/v3/playlistItems", params=params)
            data = r.json()
            items.extend(data.get("items", []))
            page_token = data.get("nextPageToken", "")
            if not page_token:
                break
    return items
