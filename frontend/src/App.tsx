import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Watch from './pages/Watch'
import Search from './pages/Search'
import Admin from './pages/Admin'
import HiddenPosts from './pages/HiddenPosts'
import Favorites from './pages/Favorites'
import WatchlistPage from './pages/WatchlistPage'
import CategoryPage from './pages/CategoryPage'
import CollectionPage from './pages/CollectionPage'
import CollectionsPage from './pages/CollectionsPage'
import TmdbCollectionPage from './pages/TmdbCollectionPage'
import SettingsPage from './pages/SettingsPage'
import { DashboardSkeleton } from './components/ui/Skeleton'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <DashboardSkeleton />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="watch/:id" element={<Watch />} />
        <Route path="search" element={<Search />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="watchlist" element={<WatchlistPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="collection/:id" element={<CollectionPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="collections/:name" element={<TmdbCollectionPage />} />
        <Route path="admin" element={<Admin />} />
        <Route path="hidden" element={<HiddenPosts />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
