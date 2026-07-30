import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Video } from '../../types'
import { timeAgo, truncate } from '../../utils/helpers'
import { updateVideo } from '../../api/videos'

interface VideoCardProps {
  video: Video
  onFavoriteToggle?: () => void
}

export default function VideoCard({ video, onFavoriteToggle }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [favorite, setFavorite] = useState(video.is_favorite)
  const [imgFallback, setImgFallback] = useState(0)

  const tmdbBackdrop = video.tmdb_backdrop_url
  const tmdbPoster = video.tmdb_poster_url
  const youtube = `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`

  const thumbSources = [
    video.thumbnail_url,
    video.thumbnail_override,
    tmdbBackdrop,
    tmdbPoster,
    youtube,
  ].filter(Boolean) as string[]

  const thumbSrc = thumbSources[imgFallback] || thumbSources[0]

  const handleImgError = () => {
    if (imgFallback < thumbSources.length - 1) {
      setImgFallback(i => i + 1)
    }
  }

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await updateVideo(video.id, { is_favorite: !favorite })
      setFavorite(!favorite)
      onFavoriteToggle?.()
    } catch {
      // silent
    }
  }

  const progress = video.watch_progress || 0

  return (
    <motion.div
      className="flex-shrink-0 w-[280px]"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link to={`/watch/${video.id}`} className="block group">
        <div className="relative aspect-video rounded-lg overflow-hidden mb-2 video-card cursor-pointer">
          <img
            src={thumbSrc}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            onError={handleImgError}
          />

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />

          <div className="absolute top-2 left-2 flex gap-1">
            {video.hidden && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-500/80 text-white">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                Hidden
              </span>
            )}
            {video.tmdb_credits?.certification && (
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-white/20 text-white">
                {video.tmdb_credits.certification}
              </span>
            )}
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleFavorite}
              className={`p-1.5 rounded-full transition-colors ${
                favorite
                  ? 'text-netflix-red bg-netflix-red/20'
                  : 'text-white bg-black/50 hover:bg-black/70'
              }`}
            >
              <svg className="w-4 h-4" fill={favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-netflix-dark/80">
              <div
                className="h-full bg-netflix-red transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="px-1">
          <h3 className="text-sm font-medium text-netflix-text truncate">
            {truncate(video.title, 60)}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {video.category && (
              <span className="text-xs text-netflix-dimmed">{video.category.name}</span>
            )}
            <span className="text-xs text-netflix-dimmed">{timeAgo(video.created_at)}</span>
          </div>
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {video.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-glass text-netflix-dimmed"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
