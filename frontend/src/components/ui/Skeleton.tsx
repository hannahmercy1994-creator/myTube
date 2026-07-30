import { motion } from 'framer-motion'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-gradient-to-r from-netflix-card via-netflix-light to-netflix-card bg-[length:200%_100%] animate-shimmer rounded ${className}`}
    />
  )
}

export function VideoCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[280px]">
      <Skeleton className=" aspect-video w-full rounded-lg mb-2" />
      <Skeleton className="h-4 w-3/4 mb-1" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function RowSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-8">
      <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
      {Array.from({ length: 4 }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  )
}
