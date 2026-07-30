import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Video } from '../../types'

interface HeroBannerProps {
  videos: Video[]
}

export default function HeroBanner({ videos }: HeroBannerProps) {
  const [current, setCurrent] = useState(0)

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + videos.length) % videos.length)
  }, [videos.length])

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % videos.length)
  }, [videos.length])

  useEffect(() => {
    if (videos.length < 2) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [videos.length, next])

  if (!videos.length) return null

  const video = videos[current]

  return (
    <div className="relative w-full h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden rounded-b-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={video.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <img
            src={video.tmdb_backdrop_url || video.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 h-full flex items-end pb-20 px-6 md:px-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
              {video.title}
            </h1>

            <div className="flex items-center gap-3 text-sm text-netflix-muted mb-3 flex-wrap">
              {video.tmdb_release_date && (
                <span>{video.tmdb_release_date.slice(0, 4)}</span>
              )}
              {video.tmdb_credits?.certification && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded border border-white/40 text-white/80">
                  {video.tmdb_credits.certification}
                </span>
              )}
              {video.tmdb_vote_average != null && (
                <span className="text-yellow-500 font-medium">
                  ★ {video.tmdb_vote_average.toFixed(1)}
                </span>
              )}
              {video.category && (
                <span className="px-2 py-0.5 rounded bg-white/10 text-xs">{video.category.name}</span>
              )}
            </div>

            {video.tmdb_overview && (
              <p className="text-sm md:text-base text-gray-200 line-clamp-3 mb-5 leading-relaxed">
                {video.tmdb_overview.length > 300
                  ? video.tmdb_overview.slice(0, 300) + '...'
                  : video.tmdb_overview}
              </p>
            )}

            <Link
              to={`/watch/${video.id}`}
              className="inline-flex items-center gap-2 bg-netflix-red hover:bg-netflix-red-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Now
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {videos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === current
                    ? 'w-6 h-1.5 bg-netflix-red'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
