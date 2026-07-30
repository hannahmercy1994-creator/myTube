import asyncio
from sqlalchemy import select
from app.database import async_session
from app.models import Video
from app.tmdb import tmdb_details, apply_tmdb_details
from app.config import settings

async def main():
    api_key = settings.tmdb_api_key
    if not api_key:
        print("No TMDB API key")
        return

    async with async_session() as db:
        result = await db.execute(select(Video).where(Video.tmdb_id.isnot(None)))
        videos = result.scalars().all()
        print(f"Refreshing TMDB details for {len(videos)} videos...")

        for v in videos:
            details = await tmdb_details(v.tmdb_id, api_key, v.tmdb_type or "movie")
            if details:
                apply_tmdb_details(v, details, v.tmdb_id, v.tmdb_type or "movie")
                print(f"  Updated: {v.title[:50]}")
            else:
                print(f"  Failed: {v.title[:50]}")

        await db.commit()
        print("Done!")

asyncio.run(main())
