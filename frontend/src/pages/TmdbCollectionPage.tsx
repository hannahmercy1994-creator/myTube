import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getVideos, toggleFavorite } from '../api/videos'
import type { Video } from '../types'
import { DashboardSkeleton } from '../components/ui/Skeleton'

export default function TmdbCollectionPage() {
  const { name } = useParams<{ name: string }>()
  const collectionName = name ? decodeURIComponent(name) : ''
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)

  const load = async (p: number) => {
    setLoading(true)
    try {
      const result = await getVideos({ collection_name: collectionName, page: p, per_page: 24 })
      setVideos(result.items)
      setTotal(result.total)
      setPages(result.pages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (collectionName) load(page)
  }, [page, collectionName])

  if (!collectionName) {
    return (
      <div className="px-4 md:px-10 lg:px-14 max-w-[1800px] mx-auto pt-6 pb-16 text-center py-20">
        <h2 className="text-2xl font-semibold mb-2">Collection not found</h2>
        <Link to="/collections" className="text-netflix-red hover:underline">Browse collections</Link>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-10 lg:px-14 max-w-[1800px] mx-auto pt-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/collections" className="text-sm text-netflix-muted hover:text-netflix-text transition-colors mb-1 inline-block">&larr; Collections</Link>
          <h1 className="text-2xl md:text-3xl font-bold">{collectionName}</h1>
        </div>
        <span className="text-sm text-netflix-dimmed">{total} movie{total !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-2">No movies in this collection</h2>
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
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(video.id, !video.is_favorite).then(() => load(page)).catch(() => {}) }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                    >
                      <svg className={`w-4 h-4 ${video.is_favorite ? 'text-netflix-red fill-netflix-red' : 'text-white fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
  )
}
