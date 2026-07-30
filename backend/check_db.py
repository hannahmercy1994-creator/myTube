import asyncio
from sqlalchemy import select
from app.database import async_session
from app.models import Video

async def main():
    async with async_session() as db:
        r = await db.execute(select(Video))
        vs = r.scalars().all()
        print(f"Count: {len(vs)}")
        for v in vs:
            print(f"ID={v.id}: {v.title[:60]} | yt={v.youtube_id}")

asyncio.run(main())
