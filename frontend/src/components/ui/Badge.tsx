import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'red' | 'outline'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-glass text-netflix-muted border border-glass-border',
    red: 'bg-netflix-red/20 text-netflix-red border border-netflix-red/30',
    outline: 'bg-transparent border border-glass-border text-netflix-muted',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
