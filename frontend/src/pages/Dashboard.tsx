import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getVideos, getGenres, toggleFavorite, toggleWatchlist, getFeatured } from '../api/videos'
import { importChannel } from '../api/youtube'
import type { Video } from '../types'
import { useAuth } from '../context/AuthContext'
import { DashboardSkeleton } from '../components/ui/Skeleton'
import HeroBanner from '../components/hero/HeroBanner'

export default function Dashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const setPage = useCallback((p: number) => {
    setSearchParams((prev) => {
      if (p <= 1) prev.delete('page')
      else prev.set('page', String(p))
      return prev
    }, { replace: true })
  }, [setSearchParams])
  const [videos, setVideos] = useState<Video[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [featuredVideos, setFeaturedVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [sort, setSort] = useState('recent')
  const [favoriteFilter, setFavoriteFilter] = useState(false)
  const castFilter = searchParams.get('cast') || ''

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string | number | boolean> = { page, per_page: 24 }
    if (search) params.search = search
    if (genre) params.genre = genre
    if (sort) params.sort = sort
    if (favoriteFilter) params.favorite = true
    if (castFilter) params.cast = castFilter
    Promise.all([
      getVideos(params as any),
      getGenres(),
      getFeatured(),
    ])
      .then(([v, g, f]) => {
        setVideos(v.items)
        setTotal(v.total)
        setPages(v.pages)
        setGenres(g)
        setFeaturedVideos(f)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, search, genre, sort, favoriteFilter, castFilter])

  const [channelUrl, setChannelUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState('')

  const loadVideos = useCallback(async (p: number) => {
    const params: Record<string, string | number | boolean> = { page: p, per_page: 24 }
    if (search) params.search = search
    if (genre) params.genre = genre
    if (sort) params.sort = sort
    if (favoriteFilter) params.favorite = true
    if (castFilter) params.cast = castFilter
    const v = await getVideos(params as any)
    setVideos(v.items)
    setTotal(v.total)
    setPages(v.pages)
  }, [search, genre, sort, favoriteFilter, castFilter])

  const handleImport = async () => {
    if (!channelUrl.trim()) return
    setImporting(true)
    setImportResult('')
    try {
      const r = await importChannel(channelUrl.trim(), 50, true)
      setImportResult(`Imported ${r.imported}, skipped ${r.skipped} (${r.total_found} found)`)
      setPage(1)
      await loadVideos(1)
    } catch (err: any) {
      setImportResult(err?.response?.data?.detail || err?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="pb-16">
      {!search && !genre && sort === 'recent' && !favoriteFilter && !castFilter && (
        <HeroBanner videos={featuredVideos} />
      )}

      <div className="px-4 md:px-10 lg:px-14 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-end mb-6 pt-6">
        <span className="text-sm text-netflix-dimmed">{total} movie{total !== 1 ? 's' : ''}</span>
      </div>

      {user?.is_admin && (
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1 block">Import from YouTube Channel</label>
              <input
                type="text"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="@channel or channel URL..."
                className="w-full bg-netflix-dark border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              />
            </div>
            <button
              onClick={handleImport}
              disabled={importing || !channelUrl.trim()}
              className="bg-netflix-red hover:bg-netflix-red-hover disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap mt-5 sm:mt-0"
            >
              {importing ? 'Importing...' : 'Import Channel'}
            </button>
          </div>
          {importResult && (
            <p className="text-xs text-netflix-muted mt-2">{importResult}</p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search movies..."
            className="flex-1 sm:w-64 bg-netflix-dark border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
          />
          <select
            value={genre}
            onChange={(e) => { setGenre(e.target.value); setPage(1) }}
            className="bg-netflix-dark border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text focus:outline-none focus:border-netflix-red/50"
          >
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="bg-netflix-dark border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text focus:outline-none focus:border-netflix-red/50"
          >
            <option value="recent">Recently Added</option>
            <option value="tmdb_recent">TMDB Release Year</option>
            <option value="oldest">Oldest</option>
            <option value="most_watched">Most Watched</option>
            <option value="alphabetical">A-Z</option>
          </select>
          <button
            onClick={() => { setFavoriteFilter(!favoriteFilter); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              favoriteFilter ? 'bg-netflix-red text-white' : 'bg-netflix-dark border border-glass-border text-netflix-muted hover:text-netflix-text'
            }`}
          >
            <svg className={`w-4 h-4 ${favoriteFilter ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Favorites
          </button>
        </div>
      </div>

      {castFilter && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className="text-netflix-dimmed">Cast:</span>
          <span className="bg-netflix-red/20 text-netflix-red px-2 py-0.5 rounded text-sm font-medium flex items-center gap-1.5">
            {castFilter}
            <button
              onClick={() => { setSearchParams((prev) => { prev.delete('cast'); return prev }, { replace: true }) }}
              className="hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-2">No movies found</h2>
          <p className="text-netflix-muted mb-6">Try a different search or add videos in the admin panel.</p>
          <Link to="/admin" className="bg-netflix-red hover:bg-netflix-red-hover text-white px-6 py-2.5 rounded font-medium transition-colors inline-block">
            Add Video
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {videos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Link to={`/watch/${video.id}`} className="block group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                      <img
                        src={video.tmdb_poster_url || video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(video.id, !video.is_favorite).then(() => loadVideos(page)).catch(() => {}) }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                      >
                        <svg className={`w-4 h-4 ${video.is_favorite ? 'text-netflix-red fill-netflix-red' : 'text-white fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatchlist(video.id, !video.in_watchlist).then(() => loadVideos(page)).catch(() => {}) }}
                        className="absolute top-10 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                      >
                        <svg className={`w-4 h-4 ${video.in_watchlist ? 'text-white fill-white' : 'text-white fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                      {video.tmdb_vote_average != null && (
                        <div className="absolute top-2 left-2 bg-black/70 rounded px-1.5 py-0.5 text-xs text-yellow-500 font-medium">
                          {video.tmdb_vote_average.toFixed(1)}
                        </div>
                      )}
                    </div>
                  <h3 className="text-sm font-medium text-netflix-text truncate leading-tight">{video.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {video.category && (
                      <span className="text-xs text-netflix-dimmed">{video.category.name}</span>
                    )}
                    {video.tmdb_release_date && (
                      <span className="text-xs text-netflix-dimmed">{video.tmdb_release_date.slice(0, 4)}</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="bg-glass hover:bg-glass-hover disabled:opacity-30 text-netflix-text px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
                let p: number
                if (pages <= 7) {
                  p = i + 1
                } else if (page <= 4) {
                  p = i + 1
                } else if (page >= pages - 3) {
                  p = pages - 6 + i
                } else {
                  p = page - 3 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      page === p
                        ? 'bg-netflix-red text-white'
                        : 'bg-glass text-netflix-muted hover:text-netflix-text'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page >= pages}
                className="bg-glass hover:bg-glass-hover disabled:opacity-30 text-netflix-text px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </div>
  )
}
