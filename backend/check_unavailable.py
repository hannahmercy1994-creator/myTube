import asyncio, httpx
from sqlalchemy import select, delete
from app.database import async_session
from app.models import Video

async def main():
    async with async_session() as db:
        result = await db.execute(select(Video))
        videos = result.scalars().all()
        print(f"Checking {len(videos)} videos via HEAD...")

        removed = []
        kept = []

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
            for v in videos:
                url = f"https://www.youtube.com/watch?v={v.youtube_id}"
                try:
                    r = await c.head(url)
                    if r.status_code == 200:
                        kept.append(v.title)
                    else:
                        await db.execute(delete(Video).where(Video.id == v.id))
                        removed.append(f"{v.title[:50]} (HTTP {r.status_code})")
                except Exception as e:
                    kept.append(v.title)

        await db.commit()
        print(f"\nRemoved: {len(removed)}")
        for t in removed:
            print(f"  - {t}")
        print(f"Kept: {len(kept)}")

asyncio.run(main())
