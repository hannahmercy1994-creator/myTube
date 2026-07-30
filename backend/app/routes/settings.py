import json
import shutil
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..models import Video, Category, Collection, Tag, User
from ..routes.auth import get_current_user, pwd_context

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings(user: User = Depends(get_current_user)):
    return {
        "theme": "dark",
        "default_browser": "system",
    }


@router.post("/backup")
async def backup_database(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    videos_result = await db.execute(
        select(Video).options(selectinload(Video.category), selectinload(Video.tags))
    )
    videos = videos_result.scalars().all()

    categories_result = await db.execute(select(Category))
    categories = categories_result.scalars().all()

    collections_result = await db.execute(
        select(Collection).options(selectinload(Collection.videos))
    )
    collections = collections_result.scalars().all()

    tags_result = await db.execute(select(Tag))
    tags = tags_result.scalars().all()

    backup = {
        "version": "1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "videos": [
            {
                "title": v.title,
                "youtube_url": v.youtube_url,
                "youtube_id": v.youtube_id,
                "description": v.description,
                "category": v.category.name if v.category else None,
                "tags": [t.name for t in v.tags],
                "thumbnail_url": v.thumbnail_url,
                "thumbnail_override": v.thumbnail_override,
                "watched": v.watched,
                "rating": v.rating,
                "notes": v.notes,
                "watch_count": v.watch_count,
                "watch_progress": v.watch_progress,
            }
            for v in videos
        ],
        "categories": [{"name": c.name, "slug": c.slug} for c in categories],
        "collections": [
            {
                "name": c.name,
                "description": c.description,
                "videos": [v.youtube_url for v in c.videos],
            }
            for c in collections
        ],
        "tags": [{"name": t.name} for t in tags],
    }

    return backup


@router.post("/restore")
async def restore_database(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = await file.read()
    data = json.loads(content)

    # Clear existing data
    for model in [Video, Collection, Category, Tag]:
        await db.execute(model.__table__.delete())

    # Restore categories
    category_map = {}
    for cat_data in data.get("categories", []):
        category = Category(name=cat_data["name"], slug=cat_data.get("slug", cat_data["name"].lower().replace(" ", "-")))
        db.add(category)
        await db.flush()
        category_map[cat_data["name"]] = category

    # Restore tags
    tag_map = {}
    for tag_data in data.get("tags", []):
        tag = Tag(name=tag_data["name"])
        db.add(tag)
        await db.flush()
        tag_map[tag_data["name"]] = tag

    # Restore videos
    youtube_url_map = {}
    for vid_data in data.get("videos", []):
        category = category_map.get(vid_data.get("category"))
        video = Video(
            title=vid_data["title"],
            youtube_url=vid_data["youtube_url"],
            youtube_id=vid_data.get("youtube_id", ""),
            description=vid_data.get("description"),
            category_id=category.id if category else None,
            thumbnail_url=vid_data.get("thumbnail_url"),
            thumbnail_override=vid_data.get("thumbnail_override"),
            watched=vid_data.get("watched", False),
            rating=vid_data.get("rating"),
            notes=vid_data.get("notes"),
            watch_count=vid_data.get("watch_count", 0),
            watch_progress=vid_data.get("watch_progress", 0),
        )
        db.add(video)
        await db.flush()

        for tag_name in vid_data.get("tags", []):
            if tag := tag_map.get(tag_name):
                video.tags.append(tag)

        youtube_url_map[vid_data["youtube_url"]] = video

    # Restore collections
    for col_data in data.get("collections", []):
        collection = Collection(
            name=col_data["name"],
            description=col_data.get("description"),
        )
        db.add(collection)
        await db.flush()

        for url in col_data.get("videos", []):
            if video := youtube_url_map.get(url):
                collection.videos.append(video)

    await db.flush()
    return {"message": "Database restored successfully"}
