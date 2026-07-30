import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getCollection } from '../api/collections'
import type { CollectionDetail } from '../types'
import VideoCard from '../components/video/VideoCard'
import { Skeleton } from '../components/ui/Skeleton'

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>()
  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      setLoading(true)
      getCollection(parseInt(id))
        .then(setCollection)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) {
    return (
      <div className="px-8 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-video w-full rounded-lg mb-2" />
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Collection not found</h2>
          <Link to="/" className="text-netflix-red hover:underline">Go home</Link>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{collection.name}</h1>
        {collection.description && (
          <p className="text-netflix-muted text-sm mt-1">{collection.description}</p>
        )}
        <p className="text-netflix-dimmed text-sm mt-1">{collection.video_count} videos</p>
      </div>

      {collection.videos.length === 0 ? (
        <div className="text-center py-20 text-netflix-muted">
          This collection is empty. Add videos from the watch page.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {collection.videos.map((video) => (
            <div key={video.id} className="w-full">
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
