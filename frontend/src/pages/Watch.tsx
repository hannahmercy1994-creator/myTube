import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getVideo, getVideos, updateVideo, updateProgress, toggleFavorite, toggleWatchlist } from '../api/videos'
import type { Video } from '../types'
import { formatDate } from '../utils/helpers'
import { Skeleton } from '../components/ui/Skeleton'
import { guessTmdb, unlinkTmdb } from '../api/tmdb'

export default function Watch() {
  const { id } = useParams<{ id: string }>()
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [tmdbTitle, setTmdbTitle] = useState('')
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [related, setRelated] = useState<Video[]>([])

  useEffect(() => {
    if (id) {
      getVideo(parseInt(id))
        .then((v) => {
          setVideo(v)
          setRating(v.rating || 0)
          setTmdbTitle(v.title)
          updateProgress(v.id, v.watch_progress || 1).catch(() => {})
          const q = v.category?.slug
            ? { category: v.category.slug, per_page: 12 }
            : v.tmdb_credits?.genres?.length
              ? { genre: v.tmdb_credits.genres[0], per_page: 12 }
              : null
          if (q) {
            getVideos(q)
              .then(r => setRelated(r.items.filter(x => x.id !== v.id).slice(0, 6)))
              .catch(() => {})
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [id])

  const handleRating = async (r: number) => {
    setRating(r)
    if (video) {
      try { await updateVideo(video.id, { rating: r }) } catch {}
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <Skeleton className="h-[500px] w-full rounded-xl mb-8" />
        <div className="flex gap-8">
          <Skeleton className="w-48 h-72 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Video not found</h2>
          <Link to="/" className="text-netflix-red hover:underline">Go home</Link>
        </div>
      </div>
    )
  }

  const year = video.tmdb_release_date?.slice(0, 4)
  const hasTmdb = !!video.tmdb_id

  const backdropSources = [
    video.tmdb_backdrop_url,
    video.thumbnail_url,
    video.tmdb_poster_url,
    `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`,
  ].filter(Boolean) as string[]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="relative h-[50vh] min-h-[400px]">
        <img src={backdropSources[0]} alt="" onError={(e) => { const t = e.currentTarget; const i = backdropSources.indexOf(t.src); if (i < backdropSources.length - 1) t.src = backdropSources[i + 1] }} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-netflix-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-8 md:pb-12">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg max-w-3xl">{video.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm md:text-base text-netflix-muted">
              {year && <span className="text-white/80 font-medium">{year}</span>}
              {video.tmdb_credits?.certification && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded border border-netflix-muted text-netflix-muted">
                  {video.tmdb_credits.certification}
                </span>
              )}
              {video.tmdb_vote_average != null && (
                <span className="flex items-center gap-1 text-yellow-500">
                  ★ {video.tmdb_vote_average.toFixed(1)}
                </span>
              )}
              <button
                onClick={() => toggleFavorite(video.id, !video.is_favorite).then(setVideo).catch(() => {})}
                className="flex items-center gap-1 text-sm hover:scale-110 transition-transform"
              >
                <svg className={`w-5 h-5 ${video.is_favorite ? 'text-netflix-red fill-netflix-red' : 'text-netflix-muted fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {video.is_favorite && <span className="text-netflix-red text-xs">Favorited</span>}
              </button>
              <button
                onClick={() => toggleWatchlist(video.id, !video.in_watchlist).then(setVideo).catch(() => {})}
                className="flex items-center gap-1 text-sm hover:scale-110 transition-transform"
              >
                <svg className={`w-5 h-5 ${video.in_watchlist ? 'text-white fill-white' : 'text-netflix-muted fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {video.in_watchlist && <span className="text-white text-xs">Watch Later</span>}
              </button>
              {video.tmdb_credits?.trailer_key && (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="flex items-center gap-1 text-sm hover:scale-110 transition-transform text-netflix-red hover:text-netflix-red-hover"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play Trailer
                </button>
              )}
              {video.category && (
                <Link to={`/category/${video.category.slug}`} className="hover:text-netflix-text transition-colors">
                  {video.category.name}
                </Link>
              )}
              {video.tags.length > 0 && video.tags.map((t) => (
                <span key={t.id} className="text-xs px-2 py-0.5 rounded bg-white/10 text-netflix-text">{t.name}</span>
              ))}
              <span>{video.watch_count} views</span>
              <span>Added {formatDate(video.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6 relative z-20">
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          {hasTmdb && video.tmdb_poster_url && (
            <div className="hidden md:block w-48 flex-shrink-0 self-start">
              <img src={video.tmdb_poster_url} alt="" className="w-full rounded-xl shadow-2xl" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {hasTmdb && video.tmdb_overview && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-2">Overview</h2>
                <p className="text-netflix-muted text-sm leading-relaxed">{video.tmdb_overview}</p>
              </div>
            )}

            {video.tmdb_credits?.cast && video.tmdb_credits.cast.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3">Cast</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {video.tmdb_credits.cast.slice(0, 10).map((actor) => (
                    <Link
                      key={actor.name}
                      to={`/?cast=${encodeURIComponent(actor.name)}`}
                      className="flex-shrink-0 w-24 text-center group block"
                    >
                      <div className="w-20 h-20 mx-auto mb-1.5 rounded-full overflow-hidden bg-netflix-dark ring-2 ring-transparent group-hover:ring-netflix-red transition-all">
                        {actor.profile_path ? (
                          <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt=""
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg text-netflix-dimmed">?</div>
                        )}
                      </div>
                      <p className="text-xs text-netflix-text leading-tight truncate group-hover:text-netflix-red transition-colors">{actor.name}</p>
                      <p className="text-[10px] text-netflix-dimmed leading-tight truncate">{actor.character}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {video.description && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-netflix-muted text-sm leading-relaxed whitespace-pre-wrap">{video.description}</p>
              </div>
            )}
          </div>

          <div className="md:w-72 flex-shrink-0 space-y-6">
            {video.tmdb_release_date && (
              <div className="glass rounded-xl p-4">
                <h3 className="text-xs font-semibold text-netflix-dimmed uppercase tracking-wider mb-2">Details</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-netflix-dimmed">Released:</span> <span className="text-netflix-text">{video.tmdb_release_date}</span></div>
                  {video.tmdb_credits?.runtime && (
                    <div><span className="text-netflix-dimmed">Runtime:</span> <span className="text-netflix-text">{Math.floor(video.tmdb_credits.runtime / 60)}h {video.tmdb_credits.runtime % 60}m</span></div>
                  )}
                  {video.tmdb_credits?.director && (
                    <div><span className="text-netflix-dimmed">Director:</span> <span className="text-netflix-text">{video.tmdb_credits.director}</span></div>
                  )}
                  {video.tmdb_credits?.genres && video.tmdb_credits.genres.length > 0 && (
                    <div>
                      <span className="text-netflix-dimmed">Genres:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {video.tmdb_credits.genres.map((g) => (
                          <span key={g} className="text-xs px-2 py-0.5 rounded bg-white/10 text-netflix-text">{g}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {video.tmdb_credits?.tagline && (
                    <p className="text-xs text-netflix-muted italic mt-2">"{video.tmdb_credits.tagline}"</p>
                  )}
                </div>
              </div>
            )}

            <Link to="/" className="flex items-center justify-center gap-2 text-sm text-netflix-muted hover:text-netflix-text transition-colors glass rounded-xl p-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Back to Movies
            </Link>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden mb-3 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=0&rel=0`}
            title={video.title}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <a href={video.youtube_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-glass hover:bg-glass-hover text-netflix-muted hover:text-netflix-text px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mb-8 mx-4 md:mx-8">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c1.1 0 2 .9 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          Watch on YouTube (if embed is restricted)
        </a>

        {related.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-netflix-text mb-4">More Like This</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {related.map(v => (
                <Link key={v.id} to={`/watch/${v.id}`} className="block group">
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                    <img
                      src={v.thumbnail_url || v.tmdb_backdrop_url || v.tmdb_poster_url || `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                      alt={v.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-netflix-text truncate">{v.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {v.tmdb_vote_average != null && (
                      <span className="text-xs text-yellow-500">★ {v.tmdb_vote_average.toFixed(1)}</span>
                    )}
                    {v.tmdb_credits?.certification && (
                      <span className="text-[10px] px-1 py-0.5 rounded border border-netflix-dimmed text-netflix-dimmed">
                        {v.tmdb_credits.certification}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {trailerOpen && video.tmdb_credits?.trailer_key && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setTrailerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setTrailerOpen(false)}
                className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm transition-colors"
              >
                Close ✕
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${video.tmdb_credits.trailer_key}?autoplay=1&rel=0`}
                title="Trailer"
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
