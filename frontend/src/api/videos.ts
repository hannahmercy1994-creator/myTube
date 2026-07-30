import api from './client'
import type { Video, PaginatedResponse, DashboardData, Stats, VideoFormData, SortOption, TmdbCollection } from '../types'

export const getVideos = async (params?: {
  search?: string
  category?: string
  collection?: number
  genre?: string
  collection_name?: string
  cast?: string
  sort?: SortOption
  favorite?: boolean
  watchlist?: boolean
  hidden?: boolean
  page?: number
  per_page?: number
}) => {
  const { data } = await api.get<PaginatedResponse>('/videos', { params })
  return data
}

export const getVideo = async (id: number) => {
  const { data } = await api.get<Video>(`/videos/${id}`)
  return data
}

export const createVideo = async (video: VideoFormData) => {
  const { data } = await api.post<Video>('/videos', video)
  return data
}

export const updateVideo = async (id: number, video: Partial<VideoFormData>) => {
  const { data } = await api.put<Video>(`/videos/${id}`, video)
  return data
}

export const toggleFavorite = async (id: number, favorite: boolean) => {
  const { data } = await api.post<Video>(`/videos/${id}/favorite`, { is_favorite: favorite })
  return data
}

export const toggleWatchlist = async (id: number, in_watchlist: boolean) => {
  const { data } = await api.post<Video>(`/videos/${id}/watchlist`, { in_watchlist })
  return data
}

export const deleteVideo = async (id: number) => {
  const { data } = await api.delete(`/videos/${id}`)
  return data
}

export const updateProgress = async (id: number, progress: number) => {
  const { data } = await api.patch<Video>(`/videos/${id}/progress`, { progress })
  return data
}

export const getFeatured = async () => {
  const { data } = await api.get<Video[]>('/videos/featured')
  return data
}

export const getDashboard = async () => {
  const { data } = await api.get<DashboardData>('/videos/dashboard')
  return data
}

export const getStats = async () => {
  const { data } = await api.get<Stats>('/videos/stats')
  return data
}

export const importVideos = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/videos/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const getGenres = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/videos/genres')
  return data
}

export const getCollections = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/videos/collections')
  return data
}

export const getTmdbCollections = async (): Promise<TmdbCollection[]> => {
  const { data } = await api.get<TmdbCollection[]>('/videos/tmdb-collections')
  return data
}

export const toggleHidden = async (id: number) => {
  const { data } = await api.post<{hidden: boolean}>(`/videos/${id}/toggle-hidden`)
  return data
}

export const exportVideos = async () => {
  const { data } = await api.get('/videos/export/json')
  return data
}

export const uploadThumbnail = async (id: number, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post<{thumbnail_url: string}>(`/videos/${id}/thumbnail`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
