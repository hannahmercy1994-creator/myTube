import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getTmdbCollections } from '../api/videos'
import type { TmdbCollection } from '../types'

const DEFAULT_POSTER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzJhMmEyYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+Tm8gUG9zdGVyPC90ZXh0Pjwvc3ZnPg=='

function CollageGrid({ posters }: { posters: string[] }) {
  const imgs = posters.slice(0, 4)
  const len = imgs.length
  if (len === 0) {
    return <img src={DEFAULT_POSTER} alt="" className="w-full h-full object-cover" />
  }
  if (len === 1) {
    return <img src={imgs[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
  }
  if (len === 2) {
    return (
      <div className="w-full h-full flex">
        {imgs.map((url, i) => (
          <div key={i} className="flex-1 overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    )
  }
  if (len === 3) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex flex-1">
          {imgs.slice(0, 2).map((url, i) => (
            <div key={i} className="flex-1 overflow-hidden">
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          <img src={imgs[2]} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>
    )
  }
  return (
    <div className="w-full h-full grid grid-cols-2">
      {imgs.map((url, i) => (
        <div key={i} className="overflow-hidden">
          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  )
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<TmdbCollection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTmdbCollections()
      .then(setCollections)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="px-4 md:px-10 lg:px-14 max-w-[1800px] mx-auto pt-6 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-lg bg-netflix-dark mb-2" />
              <div className="h-4 bg-netflix-dark rounded w-3/4 mb-1" />
              <div className="h-3 bg-netflix-dark rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-10 lg:px-14 max-w-[1800px] mx-auto pt-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Collections</h1>
        <span className="text-sm text-netflix-dimmed">{collections.length} collection{collections.length !== 1 ? 's' : ''}</span>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-2">No collections found</h2>
          <p className="text-netflix-muted">Collections appear when videos have TMDB metadata with collection info.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {collections.map((col, i) => (
            <motion.div
              key={col.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link to={`/collections/${encodeURIComponent(col.name)}`} className="block group">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                  <CollageGrid posters={col.poster_urls} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
                <h3 className="text-sm font-medium text-netflix-text truncate leading-tight group-hover:text-white transition-colors">{col.name}</h3>
                <p className="text-xs text-netflix-dimmed mt-0.5">{col.video_count} movie{col.video_count !== 1 ? 's' : ''}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
