export interface User {
  id: number
  username: string
  is_admin: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  created_at?: string
  video_count: number
}

export interface Tag {
  id: number
  name: string
}

export interface Video {
  id: number
  title: string
  youtube_url: string
  youtube_id: string
  description?: string
  category_id?: number
  thumbnail_url?: string
  thumbnail_override?: string
  backdrop_url?: string
  is_favorite: boolean
  in_watchlist: boolean
  hidden: boolean
  watched: boolean
  rating?: number
  notes?: string
  watch_count: number
  watch_progress: number
  last_watched?: string
  created_at?: string
  updated_at?: string
  category?: Category
  tags: Tag[]
  tmdb_id?: number
  tmdb_type?: string
  tmdb_poster_url?: string
  tmdb_backdrop_url?: string
  tmdb_overview?: string
  tmdb_vote_average?: number
  tmdb_release_date?: string
  tmdb_collection?: string
  tmdb_credits?: {
    cast: { name: string; character: string; profile_path?: string | null }[]
    director?: string
    genres?: string[]
    runtime?: number
    tagline?: string
    status?: string
    trailer_key?: string
    certification?: string
  }
}

export interface Collection {
  id: number
  name: string
  description?: string
  created_at?: string
  video_count: number
}

export interface CollectionDetail extends Collection {
  videos: Video[]
}

export interface PaginatedResponse {
  items: Video[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface DashboardData {
  recently_added: Video[]
  continue_watching: Video[]
  favorites: Video[]
  trending: Video[]
  categories: DashboardCategory[]
}

export interface DashboardCategory {
  category: Category
  videos: Video[]
}

export interface Stats {
  total_videos: number
  total_categories: number
  total_collections: number
  total_watched: number
  total_favorites: number
}

export interface VideoFormData {
  title: string
  youtube_url: string
  description?: string
  category_id?: number
  thumbnail_url?: string
  thumbnail_override?: string
  is_favorite: boolean
  in_watchlist: boolean
  hidden: boolean
  watched: boolean
  rating?: number
  notes?: string
  tags?: string[]
  tmdb_id?: number
  tmdb_type?: string
  tmdb_poster_url?: string
  tmdb_backdrop_url?: string
  tmdb_overview?: string
  tmdb_vote_average?: number
  tmdb_release_date?: string
  tmdb_collection?: string
}

export interface TmdbSearchResult {
  tmdb_id: number
  tmdb_type: string
  title: string
  overview: string
  poster_url?: string
  backdrop_url?: string
  vote_average?: number
  release_date?: string
  year?: string
}

export interface TmdbCollection {
  name: string
  video_count: number
  poster_urls: string[]
  backdrop_url?: string
}

export type SortOption = 'recent' | 'oldest' | 'most_watched' | 'favorites' | 'alphabetical' | 'recently_watched' | 'tmdb_recent'
