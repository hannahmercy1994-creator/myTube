import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getVideos, getGenres, getTmdbCollections } from '../api/videos'
import type { Video, SortOption, TmdbCollection } from '../types'
import VideoCard from '../components/video/VideoCard'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'most_watched', label: 'Most Watched' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'recently_watched', label: 'Last Watched' },
]

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const categoryFilter = searchParams.get('genre') || ''
  const collectionFilter = searchParams.get('collection_name') || ''
  const sortFilter = (searchParams.get('sort') as SortOption) || 'recent'

  const [videos, setVideos] = useState<Video[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [tmdbCollections, setTmdbCollections] = useState<TmdbCollection[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(query)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    setSearchInput(query)
  }, [query])

  useEffect(() => {
    getGenres().then(setGenres).catch(() => {})
    getTmdbCollections().then(setTmdbCollections).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    const params: Record<string, string | number> = { per_page: 20 }
    if (query) params.search = query
    if (categoryFilter) params.genre = categoryFilter
    if (collectionFilter) params.collection_name = collectionFilter
    if (sortFilter) params.sort = sortFilter

    getVideos(params)
      .then((data) => {
        setVideos(data.items)
        setTotal(data.total)
        setPages(data.pages)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [query, categoryFilter, collectionFilter, sortFilter])

  const loadMore = async () => {
    const nextPage = page + 1
    if (nextPage > pages) return
    const params: Record<string, string | number> = { page: nextPage, per_page: 20 }
    if (query) params.search = query
    if (categoryFilter) params.genre = categoryFilter
    if (collectionFilter) params.collection_name = collectionFilter
    if (sortFilter) params.sort = sortFilter

    try {
      const data = await getVideos(params)
      setVideos((prev) => [...prev, ...data.items])
      setPage(nextPage)
    } catch {
      // silent
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchInput.trim()) params.set('q', searchInput.trim())
    if (categoryFilter) params.set('genre', categoryFilter)
    if (collectionFilter) params.set('collection_name', collectionFilter)
    if (sortFilter && sortFilter !== 'recent') params.set('sort', sortFilter)

    const qs = params.toString()
    setSearchParams(qs ? `?${qs}` : '')
  }

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    setSearchParams(params)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-6">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-2xl">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, tag, description, or category..."
            className="w-full bg-netflix-dark border border-glass-border rounded-xl px-5 py-3 text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50 transition-colors text-lg"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-netflix-muted hover:text-netflix-text transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm text-netflix-muted">Filters:</span>

        <select
          value={categoryFilter}
          onChange={(e) => updateFilter('genre', e.target.value)}
          className="bg-netflix-dark border border-glass-border rounded-lg px-3 py-1.5 text-sm text-netflix-text focus:outline-none focus:border-netflix-red/50"
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          value={collectionFilter}
          onChange={(e) => updateFilter('collection_name', e.target.value)}
          className="bg-netflix-dark border border-glass-border rounded-lg px-3 py-1.5 text-sm text-netflix-text focus:outline-none focus:border-netflix-red/50"
        >
          <option value="">All Collections</option>
          {tmdbCollections.map((col) => (
            <option key={col.name} value={col.name}>{col.name} ({col.video_count})</option>
          ))}
        </select>

        <select
          value={sortFilter}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="bg-netflix-dark border border-glass-border rounded-lg px-3 py-1.5 text-sm text-netflix-text focus:outline-none focus:border-netflix-red/50"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {query && (
        <p className="text-netflix-muted text-sm mb-4">
          {loading ? 'Searching...' : `Found ${total} results for "${query}"`}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-video w-full rounded-lg mb-2" />
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-glass flex items-center justify-center">
            <svg className="w-8 h-8 text-netflix-dimmed" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-1">No results found</h3>
          <p className="text-netflix-muted text-sm">Try different search terms or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {videos.map((video) => (
              <div key={video.id} className="w-full">
                <VideoCard video={video} />
              </div>
            ))}
          </div>

          {page < pages && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                className="bg-glass hover:bg-glass-hover text-netflix-text px-8 py-2.5 rounded-lg font-medium transition-colors border border-glass-border"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
