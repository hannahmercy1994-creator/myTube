from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TagBase(BaseModel):
    name: str


class TagResponse(TagBase):
    id: int

    class Config:
        from_attributes = True


class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    slug: str
    created_at: Optional[datetime] = None
    video_count: int = 0

    class Config:
        from_attributes = True


class VideoBase(BaseModel):
    title: str
    youtube_url: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    thumbnail_url: Optional[str] = None
    thumbnail_override: Optional[str] = None
    is_favorite: bool = False
    hidden: bool = False
    watched: bool = False
    rating: Optional[int] = None
    notes: Optional[str] = None
    tmdb_id: Optional[int] = None
    tmdb_type: Optional[str] = None
    tmdb_poster_url: Optional[str] = None
    tmdb_backdrop_url: Optional[str] = None
    tmdb_overview: Optional[str] = None
    tmdb_vote_average: Optional[float] = None
    tmdb_release_date: Optional[str] = None
    tmdb_collection: Optional[str] = None


class VideoCreate(VideoBase):
    tags: Optional[List[str]] = None


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    youtube_url: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    thumbnail_url: Optional[str] = None
    thumbnail_override: Optional[str] = None
    is_favorite: Optional[bool] = None
    hidden: Optional[bool] = None
    watched: Optional[bool] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    watch_progress: Optional[float] = None
    tmdb_id: Optional[int] = None
    tmdb_type: Optional[str] = None
    tmdb_poster_url: Optional[str] = None
    tmdb_backdrop_url: Optional[str] = None
    tmdb_overview: Optional[str] = None
    tmdb_vote_average: Optional[float] = None
    tmdb_release_date: Optional[str] = None
    tmdb_collection: Optional[str] = None


class VideoProgressUpdate(BaseModel):
    progress: float = Field(ge=0.0, le=100.0)


class VideoResponse(VideoBase):
    id: int
    youtube_id: str
    watch_count: int
    watch_progress: float
    backdrop_url: Optional[str] = None
    last_watched: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category: Optional[CategoryResponse] = None
    tags: List[TagResponse] = []
    tmdb_credits: Optional[dict] = None
    in_watchlist: bool = False

    class Config:
        from_attributes = True


class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CollectionResponse(CollectionBase):
    id: int
    created_at: Optional[datetime] = None
    video_count: int = 0

    class Config:
        from_attributes = True


class CollectionDetailResponse(CollectionResponse):
    videos: List[VideoResponse] = []


class DashboardStats(BaseModel):
    total_videos: int
    total_categories: int
    total_collections: int
    total_watched: int
    total_favorites: int
    recently_added: List[VideoResponse] = []
    continue_watching: List[VideoResponse] = []
    favorites: List[VideoResponse] = []
    trending: List[VideoResponse] = []


class ImportResult(BaseModel):
    imported: int
    errors: List[str] = []


class BackupData(BaseModel):
    videos: List[dict]
    categories: List[dict]
    collections: List[dict]
    tags: List[dict]


class VideoFilterParams(BaseModel):
    search: Optional[str] = None
    category: Optional[str] = None
    collection: Optional[int] = None
    sort: Optional[str] = None
    favorite: Optional[bool] = None
    page: int = 1
    per_page: int = 20


class PaginatedResponse(BaseModel):
    items: List[VideoResponse]
    total: int
    page: int
    per_page: int
    pages: int
