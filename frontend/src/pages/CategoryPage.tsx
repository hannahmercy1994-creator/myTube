import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getVideos } from '../api/videos'
import type { Video } from '../types'
import VideoCard from '../components/video/VideoCard'
import { Skeleton } from '../components/ui/Skeleton'

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (slug) {
      setLoading(true)
      getVideos({ category: slug, per_page: 50 })
        .then((data) => setVideos(data.items))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [slug])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-6">
      <h1 className="text-2xl font-bold mb-6 capitalize">{slug?.replace(/-/g, ' ')}</h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-video w-full rounded-lg mb-2" />
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-netflix-muted">
          No videos in this category
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {videos.map((video) => (
            <div key={video.id} className="w-full">
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
