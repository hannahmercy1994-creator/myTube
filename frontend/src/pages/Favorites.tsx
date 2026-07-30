import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getVideos, toggleFavorite } from '../api/videos'
import type { Video } from '../types'

export default function Favorites() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getVideos({ favorite: true, per_page: 100 })
      .then((v) => setVideos(v.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="pb-16 px-4 md:px-10 lg:px-14 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between mb-6 pt-6">
        <h1 className="text-2xl md:text-3xl font-bold">My Favorites</h1>
        <span className="text-sm text-netflix-dimmed">{videos.length} movie{videos.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-netflix-dark animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-2">No favorites yet</h2>
          <p className="text-netflix-muted mb-6">Click the heart icon on any movie to add it to your favorites.</p>
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
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(video.id, false).then(load).catch(() => {}) }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                  >
                    <svg className="w-4 h-4 text-netflix-red fill-netflix-red" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
      )}
    </div>
  )
}