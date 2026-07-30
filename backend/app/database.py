import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import settings

os.makedirs("data", exist_ok=True)

engine = create_async_engine(settings.database_url, echo=False, pool_size=1, max_overflow=0)

async def enable_wal():
    async with engine.connect() as conn:
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.execute(text("PRAGMA busy_timeout=5000"))
        await conn.commit()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    await enable_wal()
    async with engine.begin() as conn:
        from . import models
        await conn.run_sync(Base.metadata.create_all)

    async with engine.begin() as conn:
        result = await conn.execute(text("PRAGMA table_info(videos)"))
        cols = [row[1] for row in result]
        if "tmdb_collection" not in cols:
            await conn.execute(text("ALTER TABLE videos ADD COLUMN tmdb_collection VARCHAR(500)"))

    async with engine.begin() as conn:
        result = await conn.execute(text("PRAGMA table_info(user_favorites)"))
        if not result.fetchall():
            await conn.execute(text("""
                CREATE TABLE user_favorites (
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, video_id)
                )
            """))

    async with engine.begin() as conn:
        result = await conn.execute(text("PRAGMA table_info(user_watchlist)"))
        if not result.fetchall():
            await conn.execute(text("""
                CREATE TABLE user_watchlist (
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, video_id)
                )
            """))

    async with engine.begin() as conn:
        vcols = await conn.execute(text("PRAGMA table_info(videos)"))
        vcols_list = [row[1] for row in vcols]
        if "is_favorite" in vcols_list:
            admin_result = await conn.execute(text("SELECT id FROM users WHERE is_admin = 1 LIMIT 1"))
            admin_row = admin_result.fetchone()
            if admin_row:
                admin_id = admin_row[0]
                await conn.execute(text(f"""
                    INSERT OR IGNORE INTO user_favorites (user_id, video_id)
                    SELECT {admin_id}, id FROM videos WHERE is_favorite = 1
                """))
            await conn.execute(text("ALTER TABLE videos DROP COLUMN is_favorite"))

    async with engine.begin() as conn:
        vcols = await conn.execute(text("PRAGMA table_info(videos)"))
        vcols_list = [row[1] for row in vcols]
        if "hidden" not in vcols_list:
            await conn.execute(text("ALTER TABLE videos ADD COLUMN hidden BOOLEAN DEFAULT 0"))
