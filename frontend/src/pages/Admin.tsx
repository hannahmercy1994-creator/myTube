import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getVideos, createVideo, updateVideo, deleteVideo, importVideos, exportVideos, toggleHidden, uploadThumbnail } from '../api/videos'
import { getCategories, createCategory, deleteCategory } from '../api/categories'
import { getCollections, createCollection, deleteCollection } from '../api/collections'
import type { Video, Category, Collection, VideoFormData } from '../types'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { downloadJSON, getYoutubeId, getThumbnailUrl } from '../utils/helpers'
import { TmdbLink } from '../components/video/TmdbSearch'
import { searchTmdb, syncTmdb } from '../api/tmdb'
import type { TmdbSearchResult } from '../types'

type Tab = 'videos' | 'categories' | 'collections'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('videos')
  const [videos, setVideos] = useState<Video[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  const [form, setForm] = useState<VideoFormData>({
    title: '',
    youtube_url: '',
    description: '',
    category_id: undefined,
    thumbnail_url: '',
    thumbnail_override: '',
    is_favorite: false,
    in_watchlist: false,
    hidden: false,
    watched: false,
    rating: undefined,
    notes: '',
    tags: [],
    tmdb_collection: '',
  })

  const [tagInput, setTagInput] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newCollection, setNewCollection] = useState('')
  const [collectionDesc, setCollectionDesc] = useState('')
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbMediaType, setTmdbMediaType] = useState<'movie' | 'tv'>('movie')
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResult[]>([])
  const [tmdbSearching, setTmdbSearching] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, per_page: 10 }
      if (searchQuery) params.search = searchQuery
      const [v, cats, cols] = await Promise.all([
        getVideos(params),
        getCategories(),
        getCollections(),
      ])
      setVideos(v.items)
      setTotal(v.total)
      setPages(v.pages)
      setCategories(cats)
      setCollections(cols)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, searchQuery])

  const resetForm = () => {
    setForm({
      title: '',
      youtube_url: '',
      description: '',
      category_id: undefined,
      thumbnail_url: '',
      thumbnail_override: '',
      is_favorite: false,
      in_watchlist: false,
      hidden: false,
      watched: false,
      rating: undefined,
      notes: '',
      tags: [],
      tmdb_collection: '',
    })
    setTagInput('')
    setEditingVideo(null)
    setTmdbQuery('')
    setTmdbResults([])
  }

  const openEdit = (video: Video) => {
    setEditingVideo(video)
    setForm({
      title: video.title,
      youtube_url: video.youtube_url,
      description: video.description || '',
      category_id: video.category_id,
      thumbnail_url: video.thumbnail_url || '',
      thumbnail_override: video.thumbnail_override || '',
      is_favorite: video.is_favorite,
      in_watchlist: video.in_watchlist,
      hidden: video.hidden,
      watched: video.watched,
      rating: video.rating,
      notes: video.notes || '',
      tags: video.tags.map((t) => t.name),
      tmdb_collection: video.tmdb_collection || '',
    })
    setShowForm(true)
  }

  const handleYoutubeUrlChange = (url: string) => {
    const ytId = getYoutubeId(url)
    setForm({
      ...form,
      youtube_url: url,
      thumbnail_url: ytId ? getThumbnailUrl(ytId) : form.thumbnail_url,
    })
  }

  const addTag = () => {
    if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...(form.tags || []), tagInput.trim()] })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags?.filter((t) => t !== tag) })
  }

  const handleTmdbSearch = async (e?: any) => {
    if (e) e.preventDefault()
    if (!tmdbQuery.trim()) return
    setTmdbSearching(true)
    try {
      const data = await searchTmdb(tmdbQuery.trim(), tmdbMediaType)
      setTmdbResults(data)
    } catch (err) {
      console.error('TMDB search failed', err)
      setTmdbResults([])
    } finally {
      setTmdbSearching(false)
    }
  }

  const handleTmdbSelect = (item: TmdbSearchResult) => {
    setForm({
      ...form,
      tmdb_id: item.tmdb_id,
      tmdb_type: item.tmdb_type,
      tmdb_poster_url: item.poster_url,
      tmdb_backdrop_url: item.backdrop_url,
      tmdb_overview: item.overview,
      tmdb_vote_average: item.vote_average,
      tmdb_release_date: item.release_date,
    })
    setTmdbResults([])
    setTmdbQuery('')
  }

  const clearTmdb = () => {
    setForm({
      ...form,
      tmdb_id: undefined,
      tmdb_type: undefined,
      tmdb_poster_url: undefined,
      tmdb_backdrop_url: undefined,
      tmdb_overview: undefined,
      tmdb_vote_average: undefined,
      tmdb_release_date: undefined,
      tmdb_collection: undefined,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingVideo) {
        await updateVideo(editingVideo.id, form)
      } else {
        await createVideo(form)
      }
      setShowForm(false)
      resetForm()
      loadData()
      setMessage(editingVideo ? 'Video updated!' : 'Video created!')
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Error saving video'
      setMessage(detail)
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this video?')) return
    try {
      await deleteVideo(id)
      loadData()
      setMessage('Video deleted')
    } catch {
      setMessage('Error deleting video')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleToggleHidden = async (video: Video) => {
    try {
      const result = await toggleHidden(video.id)
      loadData()
      setMessage(result.hidden ? 'Video hidden' : 'Video unhidden')
    } catch {
      setMessage('Error toggling hidden')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await importVideos(file)
      setMessage(`Imported ${result.imported} videos` + (result.errors?.length ? ` (${result.errors.length} errors)` : ''))
      loadData()
    } catch {
      setMessage('Error importing')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleExport = async () => {
    try {
      const data = await exportVideos()
      downloadJSON(data, `mytube-export-${new Date().toISOString().split('T')[0]}.json`)
      setMessage('Export downloaded')
    } catch {
      setMessage('Error exporting')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return
    try {
      await createCategory(newCategory.trim())
      setNewCategory('')
      loadData()
    } catch {
      setMessage('Error creating category')
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category?')) return
    try {
      await deleteCategory(id)
      loadData()
    } catch {
      setMessage('Error deleting category')
    }
  }

  const handleCreateCollection = async () => {
    if (!newCollection.trim()) return
    try {
      await createCollection(newCollection.trim(), collectionDesc)
      setNewCollection('')
      setCollectionDesc('')
      loadData()
    } catch {
      setMessage('Error creating collection')
    }
  }

  const handleDeleteCollection = async (id: number) => {
    if (!confirm('Delete this collection?')) return
    try {
      await deleteCollection(id)
      loadData()
    } catch {
      setMessage('Error deleting collection')
    }
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'videos', label: `Videos (${total})` },
    { value: 'categories', label: 'Categories' },
    { value: 'collections', label: 'Collections' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <div className="flex items-center gap-3">
          {tab === 'videos' && (
            <>
              <label className="cursor-pointer bg-glass hover:bg-glass-hover border border-glass-border text-netflix-text px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {importing ? 'Importing...' : 'Import JSON'}
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button
                onClick={handleExport}
                className="bg-glass hover:bg-glass-hover border border-glass-border text-netflix-text px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={async () => {
                  try {
                    const result = await syncTmdb()
                    setMessage(`TMDB sync: ${result.matched} matched, ${result.failed} failed (${result.total} total)`)
                    loadData()
                  } catch { setMessage('Error syncing TMDB') }
                  setTimeout(() => setMessage(''), 4000)
                }}
                className="bg-glass hover:bg-glass-hover border border-glass-border text-netflix-text px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sync TMDB
              </button>
              <button
                onClick={() => { resetForm(); setShowForm(true) }}
                className="bg-netflix-red hover:bg-netflix-red-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Add Video
              </button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${
          message.includes('Error') || message.includes('already exists') || message.includes('Duplicate')
            ? 'bg-red-900/50 border border-red-700 text-red-300'
            : 'bg-glass border border-glass-border text-netflix-text'
        }`}>
          {message}
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-netflix-dark rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.value
                ? 'bg-netflix-red text-white'
                : 'text-netflix-muted hover:text-netflix-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'videos' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              placeholder="Search videos..."
              className="w-full max-w-md bg-netflix-dark border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center gap-4 bg-netflix-dark border border-glass-border rounded-lg p-3 hover:bg-netflix-card transition-colors"
                >
                  <img
                    src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
                    alt=""
                    className="w-20 h-12 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-2">
                      {video.title}
                      {video.hidden && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400">Hidden</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-netflix-dimmed">{video.youtube_id}</span>
                      {video.category && (
                        <Badge variant="outline">{video.category.name}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleHidden(video)}
                      className={`p-1.5 transition-colors ${
                        video.hidden
                          ? 'text-orange-400 hover:text-orange-300'
                          : 'text-netflix-muted hover:text-netflix-text'
                      }`}
                      title={video.hidden ? 'Unhide' : 'Hide'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {video.hidden ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        )}
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEdit(video)}
                      className="text-netflix-muted hover:text-netflix-text p-1.5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="text-netflix-muted hover:text-netflix-red p-1.5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {videos.length === 0 && (
                <div className="text-center py-10 text-netflix-muted">
                  No videos found
                </div>
              )}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="bg-glass hover:bg-glass-hover disabled:opacity-30 text-netflix-text px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
                let p: number
                if (pages <= 7) {
                  p = i + 1
                } else if (page <= 4) {
                  p = i + 1
                } else if (page >= pages - 3) {
                  p = pages - 6 + i
                } else {
                  p = page - 3 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      page === p
                        ? 'bg-netflix-red text-white'
                        : 'bg-glass text-netflix-muted hover:text-netflix-text'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page >= pages}
                className="bg-glass hover:bg-glass-hover disabled:opacity-30 text-netflix-text px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'categories' && (
        <div className="max-w-lg">
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="flex-1 bg-netflix-dark border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            />
            <button
              onClick={handleCreateCategory}
              className="bg-netflix-red hover:bg-netflix-red-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between bg-netflix-dark border border-glass-border rounded-lg p-3"
              >
                <div>
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-netflix-dimmed">{cat.video_count} videos</p>
                </div>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-netflix-muted hover:text-netflix-red p-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'collections' && (
        <div className="max-w-lg">
          <div className="flex flex-col gap-2 mb-6">
            <input
              type="text"
              value={newCollection}
              onChange={(e) => setNewCollection(e.target.value)}
              placeholder="New collection name"
              className="bg-netflix-dark border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
            />
            <input
              type="text"
              value={collectionDesc}
              onChange={(e) => setCollectionDesc(e.target.value)}
              placeholder="Description (optional)"
              className="bg-netflix-dark border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
            />
            <button
              onClick={handleCreateCollection}
              className="bg-netflix-red hover:bg-netflix-red-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors self-start"
            >
              Create Collection
            </button>
          </div>

          <div className="space-y-2">
            {collections.map((col) => (
              <div
                key={col.id}
                className="flex items-center justify-between bg-netflix-dark border border-glass-border rounded-lg p-3"
              >
                <div>
                  <p className="text-sm font-medium">{col.name}</p>
                  <p className="text-xs text-netflix-dimmed">{col.video_count} videos</p>
                </div>
                <button
                  onClick={() => handleDeleteCollection(col.id)}
                  className="text-netflix-muted hover:text-netflix-red p-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); resetForm() }}
        title={editingVideo ? 'Edit Video' : 'Add Video'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-netflix-muted mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
            />
          </div>

          <div>
            <label className="block text-sm text-netflix-muted mb-1">YouTube URL *</label>
            <input
              type="url"
              value={form.youtube_url}
              onChange={(e) => handleYoutubeUrlChange(e.target.value)}
              required
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-netflix-muted mb-1">Category</label>
              <select
                value={form.category_id || ''}
                onChange={(e) => setForm({ ...form, category_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text focus:outline-none focus:border-netflix-red/50"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-netflix-muted mb-1">Rating (1-5)</label>
              <select
                value={form.rating || ''}
                onChange={(e) => setForm({ ...form, rating: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text focus:outline-none focus:border-netflix-red/50"
              >
                <option value="">No Rating</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-netflix-muted mb-1">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50 resize-y"
            />
          </div>

          <div>
            <label className="block text-sm text-netflix-muted mb-1">Thumbnail URL (optional override)</label>
            <input
              type="url"
              value={form.thumbnail_override || ''}
              onChange={(e) => setForm({ ...form, thumbnail_override: e.target.value })}
              placeholder="Leave empty for auto thumbnail"
              className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
            />
            {editingVideo && (
              <div className="mt-2">
                <label className="block text-xs text-netflix-dimmed mb-1">Or upload an image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const res = await uploadThumbnail(editingVideo.id, file)
                      setForm({ ...form, thumbnail_override: res.thumbnail_url })
                    } catch { /* ignore */ }
                  }}
                  className="w-full text-sm text-netflix-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-glass file:text-netflix-text file:text-sm file:cursor-pointer hover:file:bg-glass-hover"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-netflix-muted mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag"
                className="flex-1 bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
              />
              <button
                type="button"
                onClick={addTag}
                className="bg-glass hover:bg-glass-hover text-netflix-text px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Add
              </button>
            </div>
            {form.tags && form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-glass border border-glass-border rounded-full px-2.5 py-0.5 text-xs"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-netflix-muted hover:text-netflix-red">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm text-netflix-muted cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_favorite}
                onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })}
                className="rounded border-glass-border bg-netflix-black text-netflix-red focus:ring-netflix-red"
              />
              Favorite
            </label>
            <label className="flex items-center gap-2 text-sm text-netflix-muted cursor-pointer">
              <input
                type="checkbox"
                checked={form.hidden}
                onChange={(e) => setForm({ ...form, hidden: e.target.checked })}
                className="rounded border-glass-border bg-netflix-black text-orange-500 focus:ring-orange-500"
              />
              <span className="text-orange-400">Hidden</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-netflix-muted cursor-pointer">
              <input
                type="checkbox"
                checked={form.watched}
                onChange={(e) => setForm({ ...form, watched: e.target.checked })}
                className="rounded border-glass-border bg-netflix-black text-netflix-red focus:ring-netflix-red"
              />
              Watched
            </label>
          </div>

          <div>
            <label className="block text-sm text-netflix-muted mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-netflix-black border border-glass-border rounded-lg px-3 py-2 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50 resize-y"
            />
          </div>

          <div className="border-t border-glass-border pt-4">
            {!editingVideo && <h3 className="text-sm font-medium mb-3">TMDB Link</h3>}
            {editingVideo ? (
              <TmdbLink
                video={editingVideo}
                onLinked={(updated) => {
                  setEditingVideo(updated)
                  setForm({
                    title: updated.title,
                    youtube_url: updated.youtube_url,
                    description: updated.description || '',
                    category_id: updated.category_id,
                    thumbnail_url: updated.thumbnail_url || '',
                    thumbnail_override: updated.thumbnail_override || '',
                    is_favorite: updated.is_favorite,
                    in_watchlist: updated.in_watchlist,
                    hidden: updated.hidden,
                    watched: updated.watched,
                    rating: updated.rating,
                    notes: updated.notes || '',
                    tags: updated.tags.map((t) => t.name),
                    tmdb_id: updated.tmdb_id,
                    tmdb_type: updated.tmdb_type,
                    tmdb_poster_url: updated.tmdb_poster_url,
                    tmdb_backdrop_url: updated.tmdb_backdrop_url,
                    tmdb_overview: updated.tmdb_overview,
                    tmdb_vote_average: updated.tmdb_vote_average,
                    tmdb_release_date: updated.tmdb_release_date,
                    tmdb_collection: updated.tmdb_collection || form.tmdb_collection,
                  })
                }}
              />
            ) : (
              <div>
                {form.tmdb_id ? (
                  <div className="flex items-center gap-3 bg-glass rounded-lg p-3">
                    {form.tmdb_poster_url && (
                      <img src={form.tmdb_poster_url} alt="" className="w-10 h-15 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">TMDB #{form.tmdb_id} ({form.tmdb_type})</p>
                      {form.tmdb_vote_average != null && (
                        <p className="text-xs text-yellow-500">{'★'} {form.tmdb_vote_average.toFixed(1)}</p>
                      )}
                      {form.tmdb_release_date && (
                        <p className="text-xs text-netflix-dimmed">{form.tmdb_release_date}</p>
                      )}
                    </div>
                    <button onClick={clearTmdb} className="text-xs text-netflix-red hover:underline">Remove</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tmdbQuery}
                        onChange={(e) => setTmdbQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTmdbSearch(e)}
                        placeholder="Search TMDB..."
                        className="flex-1 bg-netflix-black border border-glass-border rounded px-2 py-1.5 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
                      />
                      <select
                        value={tmdbMediaType}
                        onChange={(e) => setTmdbMediaType(e.target.value as 'movie' | 'tv')}
                        className="bg-netflix-black border border-glass-border rounded px-2 py-1.5 text-sm text-netflix-text focus:outline-none"
                      >
                        <option value="movie">Movie</option>
                        <option value="tv">TV</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleTmdbSearch}
                        disabled={tmdbSearching || !tmdbQuery.trim()}
                        className="bg-netflix-red hover:bg-netflix-red-hover text-white px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {tmdbSearching ? '...' : 'Search'}
                      </button>
                    </div>
                    {tmdbResults.length > 0 && (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {tmdbResults.map((item) => (
                          <button
                            key={item.tmdb_id}
                            onClick={() => handleTmdbSelect(item)}
                            className="w-full flex items-center gap-2 bg-glass hover:bg-glass-hover rounded p-2 text-left transition-colors"
                          >
                            {item.poster_url && (
                              <img src={item.poster_url} alt="" className="w-8 h-12 rounded object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{item.title}</p>
                              <div className="flex items-center gap-2 text-xs text-netflix-dimmed">
                                {item.year && <span>{item.year}</span>}
                                {item.vote_average != null && (
                                  <span className="text-yellow-500">{item.vote_average.toFixed(1)}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">TMDB Collection (Franchise)</label>
            <input
              type="text"
              value={form.tmdb_collection || ''}
              onChange={(e) => setForm({ ...form, tmdb_collection: e.target.value })}
              placeholder="e.g. Final Destination Collection"
              className="bg-netflix-black border border-glass-border rounded px-2 py-1.5 text-sm text-netflix-text placeholder-netflix-dimmed focus:outline-none focus:border-netflix-red/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm() }}
              className="bg-glass hover:bg-glass-hover text-netflix-text px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-netflix-red hover:bg-netflix-red-hover text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {editingVideo ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
