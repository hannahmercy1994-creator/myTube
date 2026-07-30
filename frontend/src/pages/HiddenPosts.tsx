import { useState, useEffect } from 'react'
import { getVideos, toggleHidden } from '../api/videos'
import VideoCard from '../components/video/VideoCard'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Video } from '../types'

export default function HiddenPosts() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.is_admin) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    setLoading(true)
    getVideos({ hidden: true, per_page: 100 })
      .then(res => setVideos(res.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleUnhide = async (id: number) => {
    await toggleHidden(id)
    setVideos(prev => prev.filter(v => v.id !== id))
  }

  if (!user?.is_admin) return null

  return (
    <div className="min-h-screen bg-netflix-black px-6 pt-24">
      <div className="max-w-[1920px] mx-auto">
        <h1 className="text-2xl font-bold text-netflix-text mb-6">Hidden Posts</h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-lg bg-netflix-dark animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <p className="text-netflix-dimmed">No hidden posts.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {videos.map(video => (
              <div key={video.id} className="relative group">
                <VideoCard video={video} />
                <button
                  onClick={() => handleUnhide(video.id)}
                  className="absolute top-2 right-2 bg-netflix-red hover:bg-netflix-red-hover text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Unhide
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
