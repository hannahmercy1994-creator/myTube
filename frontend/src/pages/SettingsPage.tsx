import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { changePassword } from '../api/auth'
import { downloadJSON } from '../utils/helpers'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword || !newPassword) {
      setMessage('Fill in both fields')
      return
    }
    try {
      await changePassword(oldPassword, newPassword)
      setMessage('Password changed!')
      setOldPassword('')
      setNewPassword('')
    } catch {
      setMessage('Failed to change password. Check old password.')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const { data } = await api.post('/settings/backup')
      downloadJSON(data, `mytube-backup-${new Date().toISOString().split('T')[0]}.json`)
      setMessage('Backup downloaded')
    } catch {
      setMessage('Backup failed')
    } finally {
      setBackingUp(false)
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoring(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/settings/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessage('Database restored! Refreshing...')
      setTimeout(() => window.location.reload(), 2000)
    } catch {
      setMessage('Restore failed')
    } finally {
      setRestoring(false)
      e.target.value = ''
    }
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-8 py-6">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {message && (
        <div className="mb-4 bg-glass border border-glass-border rounded-lg px-4 py-2 text-sm">
          {message}
        </div>
      )}

      <div className="space-y-8">
        <section className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <div className="mb-4">
            <p className="text-sm text-netflix-muted">Username</p>
            <p className="font-medium">{user?.username}</p>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-sm text-netflix-muted mb-1">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text focus:outline-none focus:border-netflix-red/50"
              />
            </div>
            <div>
              <label className="block text-sm text-netflix-muted mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text focus:outline-none focus:border-netflix-red/50"
              />
            </div>
            <button
              type="submit"
              className="bg-netflix-red hover:bg-netflix-red-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Change Password
            </button>
          </form>
        </section>

        <section className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Database</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="bg-glass hover:bg-glass-hover border border-glass-border text-netflix-text px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {backingUp ? 'Backing up...' : 'Backup Database'}
            </button>
            <label className="cursor-pointer bg-glass hover:bg-glass-hover border border-glass-border text-netflix-text px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {restoring ? 'Restoring...' : 'Restore Database'}
              <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-netflix-dimmed mt-3">
            Backup saves all videos, categories, collections, and tags as a JSON file.
            Restore will replace all existing data.
          </p>
        </section>

        <section className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Theme</h2>
          <p className="text-sm text-netflix-muted mb-3">Current theme: Dark (Netflix inspired)</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-netflix-black border-2 border-netflix-red" />
            <div className="w-8 h-8 rounded-full bg-netflix-dark border border-glass-border" />
          </div>
        </section>

        <section className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Danger Zone</h2>
          <button
            onClick={logout}
            className="bg-red-900/30 hover:bg-red-900/50 text-netflix-red border border-red-900/50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </section>
      </div>
    </motion.div>
  )
}
