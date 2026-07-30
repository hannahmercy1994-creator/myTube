import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'

export default function Login() {
  const { user, isSetup, login, setup } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSetup) {
        await setup()
      } else {
        await login(username, password)
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setError(axiosErr.response?.data?.detail || 'Login failed')
      } else {
        setError('Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-netflix-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-netflix-red mb-2">MyTube</h1>
          <p className="text-netflix-muted text-sm">
            {isSetup ? 'Create your admin account' : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-netflix-dark border border-glass-border rounded-xl p-8 space-y-4">
          {error && (
            <div className="bg-netflix-red/20 border border-netflix-red/30 text-netflix-red text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {isSetup ? (
            <>
              <p className="text-netflix-muted text-sm text-center">
                No admin account exists. Create one to get started.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Admin Account'}
              </button>
              <p className="text-netflix-dimmed text-xs text-center">
                Default credentials: admin / admin
              </p>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-netflix-muted mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2.5 text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50 transition-colors"
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-netflix-muted mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2.5 text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50 transition-colors"
                  placeholder="Enter password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <p className="text-center text-sm text-netflix-dimmed">
                No account?{' '}
                <Link to="/register" className="text-netflix-red hover:underline">Sign up</Link>
              </p>
            </>
          )}
        </form>
      </motion.div>
    </div>
  )
}
