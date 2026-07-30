import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Video } from '../../types'

interface HeroBannerProps {
  video: Video
}

export default function HeroBanner({ video }: HeroBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative h-[70vh] min-h-[400px] mb-8"
    >
      <div className="absolute inset-0">
        <img
          src={video.backdrop_url || video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-gradient" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-shadow mb-4">
            {video.title}
          </h1>
          <div className="flex items-center gap-3 mb-4">
            {video.category && (
              <span className="text-sm text-netflix-muted bg-netflix-dark/60 px-2 py-1 rounded">
                {video.category.name}
              </span>
            )}
            <span className="text-sm text-netflix-muted">
              {video.watch_count} views
            </span>
            {video.rating && (
              <span className="text-sm text-yellow-500">
                {'★'.repeat(video.rating)}{'☆'.repeat(5 - video.rating)}
              </span>
            )}
          </div>
          {video.description && (
            <p className="text-netflix-muted text-sm md:text-base line-clamp-3 mb-6 max-w-xl">
              {video.description}
            </p>
          )}
          <div className="flex gap-3">
            <Link
              to={`/watch/${video.id}`}
              className="inline-flex items-center gap-2 bg-netflix-red hover:bg-netflix-red-hover text-white px-6 py-2.5 rounded font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch
            </Link>
            <a
              href={video.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-glass hover:bg-glass-hover text-white px-6 py-2.5 rounded font-medium transition-colors border border-glass-border"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
              </svg>
              YouTube
            </a>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
