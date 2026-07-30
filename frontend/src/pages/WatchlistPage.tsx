import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getVideos, toggleWatchlist } from '../api/videos'
import type { Video } from '../types'

export default function WatchlistPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getVideos({ watchlist: true, per_page: 50 })
      setVideos(result.items)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="px-4 md:px-10 lg:px-14 max-w-[1800px] mx-auto pt-6 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-lg bg-netflix-dark mb-2" />
              <div className="h-4 bg-netflix-dark rounded w-3/4 mb-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-10 lg:px-14 max-w-[1800px] mx-auto pt-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Watch Later</h1>
        <span className="text-sm text-netflix-dimmed">{videos.length} movie{videos.length !== 1 ? 's' : ''}</span>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-2">Your watchlist is empty</h2>
          <p className="text-netflix-muted mb-6">Add movies to your watchlist to watch them later.</p>
          <Link to="/" className="bg-netflix-red hover:bg-netflix-red-hover text-white px-6 py-2.5 rounded font-medium transition-colors inline-block">
            Browse Movies
          </Link>
        </div>
      ) : (
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
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatchlist(video.id, false).then(load).catch(() => {}) }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                  >
                    <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
                <h3 className="text-sm font-medium text-netflix-text truncate leading-tight">{video.title}</h3>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
