import { useState } from 'react'
import { searchTmdb, linkTmdb, unlinkTmdb } from '../../api/tmdb'
import type { TmdbSearchResult, Video } from '../../types'
import { motion, AnimatePresence } from 'framer-motion'

interface TmdbSearchProps {
  video: Video
  onLinked: (video: Video) => void
}

export function TmdbLink({ video, onLinked }: TmdbSearchProps) {
  const [query, setQuery] = useState('')
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)

  const handleSearch = async (e?: any) => {
    if (e) e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await searchTmdb(query.trim(), mediaType)
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleLink = async (item: TmdbSearchResult) => {
    setLinking(true)
    try {
      const updated = await linkTmdb(video.id, item.tmdb_id, item.tmdb_type)
      onLinked(updated)
      setResults([])
      setQuery('')
    } catch {
      // silent
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async () => {
    setLinking(true)
    try {
      const updated = await unlinkTmdb(video.id)
      onLinked(updated)
    } catch {
      // silent
    } finally {
      setLinking(false)
    }
  }

  const hasTmdb = video.tmdb_id != null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">TMDB Link</h3>
        {hasTmdb && (
          <button
            onClick={handleUnlink}
            disabled={linking}
            className="text-xs text-netflix-red hover:underline disabled:opacity-50"
          >
            Remove link
          </button>
        )}
      </div>

      {hasTmdb ? (
        <div className="flex items-center gap-3 bg-glass rounded-lg p-3">
          {video.tmdb_poster_url && (
            <img src={video.tmdb_poster_url} alt="" className="w-10 h-15 rounded object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              TMDB #{video.tmdb_id} ({video.tmdb_type})
            </p>
            {video.tmdb_vote_average != null && (
              <p className="text-xs text-yellow-500">
                {'★'} {video.tmdb_vote_average.toFixed(1)}
              </p>
            )}
            {video.tmdb_release_date && (
              <p className="text-xs text-netflix-dimmed">{video.tmdb_release_date}</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
              placeholder="Search TMDB..."
              className="flex-1 bg-netflix-black border border-glass-border rounded px-2 py-1.5 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
            />
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as 'movie' | 'tv')}
              className="bg-netflix-black border border-glass-border rounded px-2 py-1.5 text-sm text-netflix-text focus:outline-none"
            >
              <option value="movie">Movie</option>
              <option value="tv">TV</option>
            </select>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="bg-netflix-red hover:bg-netflix-red-hover text-white px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              {searching ? '...' : 'Search'}
            </button>
          </div>

          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 max-h-48 overflow-y-auto"
              >
                {results.map((item) => (
                  <button
                    key={item.tmdb_id}
                    onClick={() => handleLink(item)}
                    disabled={linking}
                    className="w-full flex items-center gap-2 bg-glass hover:bg-glass-hover rounded p-2 text-left transition-colors disabled:opacity-50"
                  >
                    {item.poster_url && (
                      <img src={item.poster_url} alt="" className="w-8 h-12 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.title}</p>
                      <div className="flex items-center gap-2 text-xs text-netflix-dimmed">
                        {item.year && <span>{item.year}</span>}
                        {item.vote_average != null && (
                          <span className="text-yellow-500">{item.vote_average.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
