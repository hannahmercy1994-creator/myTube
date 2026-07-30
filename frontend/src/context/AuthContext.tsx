import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getMe, login as apiLogin, setupAdmin as apiSetup, register as apiRegister } from '../api/auth'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isSetup: boolean
  login: (username: string, password: string) => Promise<void>
  setup: () => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSetup, setIsSetup] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('mytube_token')
    if (token) {
      getMe()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('mytube_token')
          checkSetup()
        })
        .finally(() => setLoading(false))
    } else {
      checkSetup()
      setLoading(false)
    }
  }, [])

  const checkSetup = async () => {
    try {
      await apiSetup()
      setIsSetup(true)
    } catch {
      setIsSetup(false)
    }
  }

  const login = async (username: string, password: string) => {
    await apiLogin(username, password)
    const u = await getMe()
    setUser(u)
  }

  const setup = async () => {
    await apiSetup()
    const u = await getMe()
    setUser(u)
    setIsSetup(false)
  }

  const register = async (username: string, password: string) => {
    await apiRegister(username, password)
    const u = await getMe()
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('mytube_token')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, isSetup, login, setup, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
