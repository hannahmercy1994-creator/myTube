import api from './client'
import type { Video, TmdbSearchResult } from '../types'

export const searchTmdb = async (query: string, mediaType: string = 'movie') => {
  const { data } = await api.get<TmdbSearchResult[]>('/tmdb/search', {
    params: { query, media_type: mediaType },
  })
  return data
}

export const guessTmdb = async (videoId: number, title?: string) => {
  const params: Record<string, string> = {}
  if (title) params.title = title
  const { data } = await api.post<Video>(`/tmdb/guess/${videoId}`, null, { params })
  return data
}

export const syncTmdb = async () => {
  const { data } = await api.post<{ matched: number; failed: number; total: number }>('/tmdb/sync')
  return data
}

export const linkTmdb = async (videoId: number, tmdbId: number, tmdbType: string = 'movie') => {
  const { data } = await api.post<Video>(`/tmdb/link/${videoId}`, null, {
    params: { tmdb_id: tmdbId, tmdb_type: tmdbType },
  })
  return data
}

export const unlinkTmdb = async (videoId: number) => {
  const { data } = await api.post<Video>(`/tmdb/unlink/${videoId}`)
  return data
}
