import { useRef } from 'react'
import type { Video } from '../../types'
import VideoCard from './VideoCard'

interface VideoRowProps {
  title: string
  videos: Video[]
}

export default function VideoRow({ title, videos }: VideoRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.75
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth',
      })
    }
  }

  if (!videos || videos.length === 0) return null

  return (
    <section className="mb-8 relative group/row">
      <h2 className="text-xl font-semibold text-netflix-text mb-4 px-8">{title}</h2>

      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-netflix-black/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-start pl-2"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-8 row-scroll py-1"
        >
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-netflix-black/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-end pr-2"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  )
}
