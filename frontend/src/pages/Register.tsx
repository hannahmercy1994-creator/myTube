import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'

export default function Register() {
  const { user, register } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(username, password)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setError(axiosErr.response?.data?.detail || 'Registration failed')
      } else {
        setError('Registration failed')
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
          <p className="text-netflix-muted text-sm">Create a new account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-netflix-dark border border-glass-border rounded-xl p-8 space-y-4">
          {error && (
            <div className="bg-netflix-red/20 border border-netflix-red/30 text-netflix-red text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-netflix-muted mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2.5 text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50 transition-colors"
              placeholder="Choose a username"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-sm text-netflix-muted mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2.5 text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50 transition-colors"
              placeholder="Choose a password"
              required
              minLength={4}
            />
          </div>

          <div>
            <label className="block text-sm text-netflix-muted mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2.5 text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50 transition-colors"
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <p className="text-center text-sm text-netflix-dimmed">
            Already have an account?{' '}
            <Link to="/login" className="text-netflix-red hover:underline">Sign in</Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}