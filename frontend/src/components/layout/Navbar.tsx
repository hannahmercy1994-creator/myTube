import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchOpen(false)
    }
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 px-6 py-4 transition-colors duration-300 ${
      scrolled ? 'bg-netflix-black/95 shadow-lg backdrop-blur-sm' : 'bg-gradient-to-b from-netflix-black/90 to-transparent'
    }`}>
      <div className="flex items-center justify-between max-w-[1920px] mx-auto">
        <div className="flex items-center gap-8">
          <a href="/" className="text-netflix-red text-2xl font-bold tracking-tight">
            MyTube
          </a>
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-netflix-muted hover:text-netflix-text transition-colors text-sm font-medium">
              Home
            </Link>
            <Link to="/favorites" className="text-netflix-muted hover:text-netflix-text transition-colors text-sm font-medium">
              My Favorites
            </Link>
            <Link to="/watchlist" className="text-netflix-muted hover:text-netflix-text transition-colors text-sm font-medium">
              Watch Later
            </Link>
            <Link to="/collections" className="text-netflix-muted hover:text-netflix-text transition-colors text-sm font-medium">
              Collections
            </Link>
            <Link to="/search" className="text-netflix-muted hover:text-netflix-text transition-colors text-sm font-medium">
              Search
            </Link>
            {user?.is_admin && (
              <>
                <Link to="/admin" className="text-netflix-muted hover:text-netflix-text transition-colors text-sm font-medium">
                  Admin
                </Link>
                <Link to="/hidden" className="text-netflix-muted hover:text-netflix-text transition-colors text-sm font-medium">
                  Hidden
                </Link>
              </>
            )}
            <Link to="/settings" className="text-netflix-muted hover:text-netflix-text transition-colors text-sm font-medium">
              Settings
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {searchOpen ? (
              <motion.form
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                onSubmit={handleSearch}
                className="relative"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search titles, tags, categories..."
                  className="w-full bg-netflix-dark border border-glass-border rounded px-3 py-1.5 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
                  autoFocus
                  onBlur={() => {
                    if (!searchQuery) setSearchOpen(false)
                  }}
                />
              </motion.form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="text-netflix-muted hover:text-netflix-text transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </AnimatePresence>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-full bg-netflix-red flex items-center justify-center text-sm font-medium hover:bg-netflix-red-hover transition-colors"
            >
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-netflix-dark border border-glass-border rounded-lg shadow-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-glass-border">
                    <p className="text-sm font-medium">{user?.username}</p>
                    <p className="text-xs text-netflix-dimmed">{user?.is_admin ? 'Admin' : 'User'}</p>
                  </div>
                  <Link
                    to="/favorites"
                    className="block px-4 py-2 text-sm text-netflix-muted hover:bg-glass hover:text-netflix-text transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Favorites
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-netflix-muted hover:bg-glass hover:text-netflix-text transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => { logout(); setMenuOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-netflix-muted hover:bg-glass hover:text-netflix-text transition-colors"
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  )
}
