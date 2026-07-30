from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from .database import Base


user_watchlist = Table(
    "user_watchlist",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("video_id", Integer, ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime, default=lambda: datetime.now(timezone.utc)),
)

user_favorites = Table(
    "user_favorites",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("video_id", Integer, ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime, default=lambda: datetime.now(timezone.utc)),
)

video_tags = Table(
    "video_tags",
    Base.metadata,
    Column("video_id", Integer, ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

collection_videos = Table(
    "collection_videos",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True),
    Column("video_id", Integer, ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    favorite_videos = relationship("Video", secondary=user_favorites, passive_deletes=True)
    watchlist_videos = relationship("Video", secondary=user_watchlist, passive_deletes=True)


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    youtube_url = Column(String(1000), nullable=False)
    youtube_id = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    thumbnail_url = Column(String(1000), nullable=True)
    thumbnail_override = Column(String(1000), nullable=True)
    tmdb_id = Column(Integer, nullable=True)
    tmdb_type = Column(String(10), nullable=True)
    tmdb_poster_url = Column(String(1000), nullable=True)
    tmdb_backdrop_url = Column(String(1000), nullable=True)
    tmdb_overview = Column(Text, nullable=True)
    tmdb_vote_average = Column(Float, nullable=True)
    tmdb_release_date = Column(String(20), nullable=True)
    tmdb_credits = Column(Text, nullable=True)
    tmdb_collection = Column(String(500), nullable=True)
    hidden = Column(Boolean, default=False)
    watched = Column(Boolean, default=False)
    rating = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    watch_count = Column(Integer, default=0)
    watch_progress = Column(Float, default=0.0)
    last_watched = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    category = relationship("Category", back_populates="videos")
    tags = relationship("Tag", secondary=video_tags, back_populates="videos")
    collections = relationship("Collection", secondary=collection_videos, back_populates="videos")
    favorited_by = relationship("User", secondary=user_favorites, passive_deletes=True)
    watchlisted_by = relationship("User", secondary=user_watchlist, passive_deletes=True)


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(200), nullable=False, unique=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    videos = relationship("Video", back_populates="category")


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    videos = relationship("Video", secondary=collection_videos, back_populates="collections")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)

    videos = relationship("Video", secondary=video_tags, back_populates="tags")
