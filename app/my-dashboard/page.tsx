'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  logoutAction, 
  getWatchlist, 
  addToWatchlist, 
  updateWatchlistItem, 
  deleteFromWatchlist, 
  searchMedia 
} from '@/lib/actions'
import { 
  Film, 
  Search, 
  Plus, 
  Trash2, 
  LogOut, 
  Database, 
  Copy, 
  Check, 
  X, 
  Loader2, 
  Sparkles,
  Calendar,
  MessageSquare,
  Play
} from 'lucide-react'

interface WatchlistItem {
  id: string
  title: string
  type: 'movie' | 'tv' | 'anime'
  status: 'watching' | 'plan_to_watch' | 'completed'
  poster_url?: string
  rating: number
  notes?: string
  api_id?: string
  release_year?: string
  created_at: string
}

interface SearchResult {
  api_id: string
  title: string
  type: 'movie' | 'tv' | 'anime'
  release_year: string
  poster_url: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all')
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<WatchlistItem | null>(null)

  const [searchType, setSearchType] = useState<'movie_tv' | 'anime'>('movie_tv')
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [selectedMedia, setSelectedMedia] = useState<SearchResult | null>(null)
  const [newItemStatus, setNewItemStatus] = useState<'watching' | 'plan_to_watch' | 'completed'>('plan_to_watch')
  const [newItemNotes, setNewItemNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editStatus, setEditStatus] = useState<'watching' | 'plan_to_watch' | 'completed'>('plan_to_watch')
  const [editNotes, setEditNotes] = useState('')

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [copiedSchema, setCopiedSchema] = useState(false)

  const fetchWatchlist = useCallback(async () => {
    setLoading(true)
    setDbError(null)
    try {
      const res = await getWatchlist({
        status: activeStatusFilter,
        type: activeTypeFilter,
        search: searchQuery
      })
      if (res.success && res.data) {
        setWatchlist(res.data as WatchlistItem[])
      } else {
        setDbError(res.error || 'Failed to fetch items')
      }
    } catch (err: any) {
      setDbError(err.message || 'Error connecting to server')
    } finally {
      setLoading(false)
    }
  }, [activeStatusFilter, activeTypeFilter, searchQuery])



  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])



  const handleLogout = async () => {
    await logoutAction()
    router.push('/')
    router.refresh()
  }

  const handleMediaSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!modalSearchQuery.trim()) return
    setIsSearching(true)
    setSearchError(null)
    setSelectedMedia(null)
    setSearchResults([])
    try {
      const res = await searchMedia(modalSearchQuery, searchType)
      if (res.success && res.results) {
        setSearchResults(res.results as SearchResult[])
        if (res.results.length === 0) setSearchError('No results found. Try a different query.')
      } else {
        if (res.error === 'TMDB_KEY_MISSING') setSearchError('TMDB API Key is required. Please set it in your .env file.')
        else setSearchError(res.message || 'API Search failed.')
      }
    } catch { setSearchError('Network error while searching.') }
    finally { setIsSearching(false) }
  }

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMedia) return
    setIsSubmitting(true)
    try {
      const res = await addToWatchlist({
        title: selectedMedia.title,
        type: selectedMedia.type,
        status: newItemStatus,
        poster_url: selectedMedia.poster_url || undefined,
        notes: newItemNotes,
        api_id: selectedMedia.api_id,
        release_year: selectedMedia.release_year,
      })
      if (res.success) {
        setToastMessage(`Added "${selectedMedia.title}" to watchlist!`)
        setIsAddModalOpen(false)
        setSelectedMedia(null)
        setModalSearchQuery('')
        setSearchResults([])
        setNewItemNotes('')
        setNewItemStatus('plan_to_watch')
        fetchWatchlist()
      } else { alert(res.error || 'Failed to add item') }
    } catch { alert('Failed to save item') }
    finally { setIsSubmitting(false) }
  }

  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}"?`)) return
    try {
      const res = await deleteFromWatchlist(id)
      if (res.success) {
        setToastMessage(`Removed "${title}"`)
        fetchWatchlist()
        if (detailItem?.id === id) setDetailItem(null)
      } else { alert(res.error || 'Failed to delete item') }
    } catch { alert('Error deleting item') }
  }

  const handleSaveEdit = async () => {
    if (!detailItem) return
    setIsSubmitting(true)
    try {
      const res = await updateWatchlistItem(detailItem.id, {
        status: editStatus,
        notes: editNotes,
      })
      if (res.success) {
        setToastMessage(`Updated "${detailItem.title}"`)
        setIsEditing(false)
        setDetailItem(null)
        fetchWatchlist()
      } else { alert(res.error || 'Failed to update item') }
    } catch { alert('Error updating item') }
    finally { setIsSubmitting(false) }
  }

  const handleCopySql = () => {
    const sql = `create table if not exists public.watchlist (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text not null check (type in ('movie', 'tv', 'anime')),
  status text not null check (status in ('watching', 'plan_to_watch', 'completed')),
  poster_url text,
  rating int default 0 check (rating >= 0 and rating <= 10),
  notes text, api_id text, release_year text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.watchlist enable row level security;
create policy "Allow all service role access" on public.watchlist
  for all to service_role using (true) with check (true);`
    navigator.clipboard.writeText(sql)
    setCopiedSchema(true)
    setTimeout(() => setCopiedSchema(false), 3000)
  }

  // Sort by release year descending (latest first), fallback to created_at
  const sortedWatchlist = [...watchlist].sort((a, b) => {
    const yearA = parseInt(a.release_year || '0', 10)
    const yearB = parseInt(b.release_year || '0', 10)
    if (yearB !== yearA) return yearB - yearA
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'watching': return 'Watching'
      case 'plan_to_watch': return 'Plan to watch'
      case 'completed': return 'Completed'
      default: return s
    }
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'watching': return 'bg-[#ff0000]'
      case 'completed': return 'bg-green-500'
      case 'plan_to_watch': return 'bg-yellow-500'
      default: return 'bg-zinc-400'
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col px-5 pt-5 pb-8 font-sans text-zinc-800 select-none relative">
      
      {/* ---- ROW 1: Profile (left), Search (perfectly centered & widened), Add media (right) ---- */}
      <div className="flex items-center justify-between w-full mb-3">
        
        {/* LEFT: Profile dropdown */}
        <div className="flex-1 flex justify-start">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 text-xs font-medium text-[#ff0000] flex items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors"
            >
              NM
            </button>
            {isProfileDropdownOpen && (
              <div className="absolute left-0 mt-2 w-40 bg-white border border-zinc-200 rounded-2xl p-1.5 z-50">
                <button
                  onClick={() => { handleLogout(); setIsProfileDropdownOpen(false) }}
                  className="w-full text-left px-3.5 py-2 rounded-xl text-xs hover:bg-red-50 text-red-500 transition-colors flex items-center gap-2 cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Search input (centered in center of the row & widened) */}
        <div className="flex-initial">
          <div className="relative w-80 sm:w-[450px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search watchlist..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-full pl-9 pr-3.5 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#ff0000] transition-all font-normal h-10"
            />
          </div>
        </div>

        {/* RIGHT: Add media */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#ff0000] hover:bg-[#d60000] text-white font-medium px-5 py-2 rounded-full flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97] text-xs h-10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add media</span>
          </button>
        </div>
      </div>

      {/* ---- ROW 2: Filter row (centered) with Type and Status sliding pills side-by-side ---- */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-6 w-full">
        
        {/* Group 1: Type Sliding Pills Container */}
        <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-full p-0.5 h-10 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All types' },
            { id: 'movie', label: 'Movies' },
            { id: 'tv', label: 'TV shows' },
            { id: 'anime', label: 'Anime' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTypeFilter(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all h-full flex items-center whitespace-nowrap border ${
                activeTypeFilter === t.id
                  ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Group 2: Status Sliding Pills Container */}
        <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-full p-0.5 h-10 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All entries' },
            { id: 'watching', label: 'Watching' },
            { id: 'plan_to_watch', label: 'Plan to watch' },
            { id: 'completed', label: 'Completed' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveStatusFilter(filter.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all h-full flex items-center whitespace-nowrap border ${
                activeStatusFilter === filter.id
                  ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

      </div>

      {/* ---- CONTENT AREA ---- */}
      {loading ? (
        <div className="h-64 w-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#ff0000] animate-spin" />
            <span className="text-zinc-400 text-sm font-medium">Loading your watchlist...</span>
          </div>
        </div>
      ) : dbError && dbError.includes('Could not find the table') ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 max-w-2xl mx-auto my-8 text-center">
          <Database className="w-12 h-12 text-[#ff0000] mx-auto mb-4" />
          <h2 className="text-2xl font-medium mb-3">Database setup required</h2>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed font-normal">
            The <code className="text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded text-xs">watchlist</code> table is missing. Copy the SQL below and run it in your Supabase SQL Editor.
          </p>
          <div className="bg-white border border-zinc-200 rounded-xl p-4 text-left font-mono text-[11px] text-zinc-500 max-h-48 overflow-y-auto mb-6">
            <pre>{`create table if not exists public.watchlist (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text not null check (type in ('movie', 'tv', 'anime')),
  status text not null check (status in ('watching', 'plan_to_watch', 'completed')),
  poster_url text,
  rating int default 0 check (rating >= 0 and rating <= 10),
  notes text, api_id text, release_year text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.watchlist enable row level security;
create policy "Allow all service role access" on public.watchlist
  for all to service_role using (true) with check (true);`}</pre>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button onClick={handleCopySql} className="bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-medium py-2.5 px-6 rounded-full flex items-center gap-2 cursor-pointer text-sm">
              {copiedSchema ? <><Check className="w-4 h-4 text-green-500" /><span className="text-green-500">Copied!</span></> : <><Copy className="w-4 h-4" /><span>Copy SQL</span></>}
            </button>
            <button onClick={fetchWatchlist} className="bg-[#ff0000] hover:bg-[#d60000] text-white font-medium py-2.5 px-6 rounded-full cursor-pointer text-sm">Check table</button>
          </div>
        </div>
      ) : dbError ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 max-w-xl mx-auto my-8 text-center">
          <Database className="w-10 h-10 text-[#ff0000] mx-auto mb-3" />
          <h3 className="font-medium text-lg mb-2">Database connection error</h3>
          <p className="text-zinc-400 text-sm mb-4 font-normal">{dbError}</p>
          <button onClick={fetchWatchlist} className="bg-white border border-zinc-200 text-zinc-700 font-medium px-4 py-2 rounded-full text-xs hover:bg-zinc-100 cursor-pointer">Retry</button>
        </div>
      ) : sortedWatchlist.length === 0 ? (
        <div className="h-72 w-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto mt-8">
          <Sparkles className="w-8 h-8 text-zinc-300 mb-4" />
          <h3 className="font-medium text-base mb-1 text-zinc-600">No entries found</h3>
          <p className="text-zinc-400 text-xs max-w-sm mb-5 font-normal">
            {searchQuery || activeStatusFilter !== 'all' || activeTypeFilter !== 'all'
              ? "No entries match your current filters."
              : "Start tracking by adding your first entry."}
          </p>
          {(searchQuery || activeStatusFilter !== 'all' || activeTypeFilter !== 'all') && (
            <button
              onClick={() => { setActiveStatusFilter('all'); setActiveTypeFilter('all'); setSearchQuery('') }}
              className="bg-zinc-50 border border-zinc-200 font-medium px-4 py-2 rounded-full text-xs text-zinc-500 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        /* ---- 6-COLUMN POSTER GRID ---- */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 pb-8">
          {sortedWatchlist.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setDetailItem(item)
                setIsEditing(false)
                setEditStatus(item.status)
                setEditNotes(item.notes || '')
              }}
              className="group relative cursor-pointer rounded-xl overflow-hidden aspect-[2/3] bg-zinc-200"
            >
              {/* Poster image */}
              {item.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-1">
                  <Film className="w-8 h-8" />
                  <span className="text-[10px] tracking-wider font-normal">No poster</span>
                </div>
              )}

              {/* Type badge - always visible, top left, fully rounded, white bg */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-zinc-700">
                  {item.type === 'tv' ? 'TV' : item.type === 'movie' ? 'Movie' : 'Anime'}
                </span>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                {/* Play icon - centered in the middle of the entire card */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-white/25 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                  </div>
                </div>

                {/* Bottom info */}
                <div>
                  {/* Status */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                    <span className="text-[11px] text-white/70 font-normal">{getStatusLabel(item.status)}</span>
                  </div>

                  {/* Title */}
                  <h4 className="text-white text-sm font-medium line-clamp-2 leading-snug">{item.title}</h4>
                  {item.release_year && (
                    <span className="text-white/50 text-[11px] font-normal mt-0.5 block">{item.release_year}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- DETAIL MODAL (compact, 2 columns: poster left, info right) ---- */}
      {detailItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setDetailItem(null); setIsEditing(false) } }}
        >
          <div className="bg-white border border-zinc-200 rounded-[24px] w-full max-w-2xl overflow-hidden flex flex-col md:flex-row select-none animate-scale-up">
            
            {/* Left: Poster */}
            <div className="w-full md:w-56 shrink-0 aspect-[2/3] md:aspect-auto bg-zinc-200 relative overflow-hidden">
              {detailItem.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detailItem.poster_url} alt={detailItem.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <Film className="w-12 h-12" />
                  <span className="text-[10px] tracking-wider font-normal">No poster</span>
                </div>
              )}
            </div>

            {/* Right: Info & CTAs */}
            <div className="flex-1 p-6 flex flex-col justify-between min-w-0 relative">
              
              {/* Close button */}
              <button
                onClick={() => { setDetailItem(null); setIsEditing(false) }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {!isEditing ? (
                <div className="flex-1 flex flex-col">
                  {/* Type & Year */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-medium text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">
                      {detailItem.type === 'tv' ? 'TV show' : detailItem.type === 'movie' ? 'Movie' : 'Anime'}
                    </span>
                    {detailItem.release_year && (
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {detailItem.release_year}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-medium text-zinc-900 mb-3 leading-tight pr-6">{detailItem.title}</h2>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(detailItem.status)}`} />
                    <span className="text-sm text-zinc-500 font-normal">{getStatusLabel(detailItem.status)}</span>
                  </div>

                  {/* Notes */}
                  {detailItem.notes && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 mb-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MessageSquare className="w-3 h-3 text-zinc-400" />
                        <span className="text-[10px] text-zinc-400 font-medium tracking-wider">Notes</span>
                      </div>
                      <p className="text-xs text-zinc-600 font-normal leading-relaxed">{detailItem.notes}</p>
                    </div>
                  )}

                  <div className="flex-1" />

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t border-zinc-100 mt-4">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-medium py-2.5 rounded-full text-xs cursor-pointer transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(detailItem.id, detailItem.title)}
                      className="px-4 py-2.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-500 rounded-full transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] text-[#ff0000] font-medium tracking-widest mb-1">Editing</span>
                  <h3 className="text-base font-medium text-zinc-900 mb-5 truncate pr-6">{detailItem.title}</h3>

                  {/* Status pills */}
                  <div className="mb-4">
                    <label className="text-[10px] font-medium text-zinc-400 tracking-widest block mb-2">Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'watching', label: 'Watching' },
                        { id: 'plan_to_watch', label: 'Plan to watch' },
                        { id: 'completed', label: 'Completed' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setEditStatus(s.id as any)}
                          className={`py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                            editStatus === s.id
                              ? 'bg-zinc-50 border-[#ff0000] text-[#ff0000]'
                              : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="text-[10px] font-medium text-zinc-400 tracking-widest block mb-2">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Your thoughts..."
                      rows={3}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs placeholder-zinc-400 focus:outline-none focus:border-[#ff0000] text-zinc-800 resize-none font-normal"
                    />
                  </div>

                  <div className="flex-1" />

                  {/* Save/Cancel */}
                  <div className="flex items-center gap-2 pt-4 border-t border-zinc-100 mt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 font-medium py-2.5 rounded-full text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSubmitting}
                      className="flex-1 bg-[#ff0000] hover:bg-[#d60000] disabled:opacity-80 text-white font-medium py-2.5 rounded-full text-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Save changes</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* ---- ADD MEDIA MODAL ---- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-[24px] w-full max-w-4xl max-h-[85vh] flex flex-col p-6 select-none text-zinc-800 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center text-[#ff0000]"><Plus className="w-4 h-4" /></div>
                <h3 className="font-medium text-lg">Add new media</h3>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setSelectedMedia(null); setSearchResults([]); setModalSearchQuery('') }} className="text-zinc-400 hover:text-zinc-700 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6 py-6">
              {/* Left: search */}
              <div className="flex-1 flex flex-col min-w-0">
                <form onSubmit={handleMediaSearch} className="flex gap-2.5 mb-4 flex-shrink-0">
                  <div className="bg-zinc-50 border border-zinc-200 rounded-full p-0.5 shrink-0 flex">
                    <button type="button" onClick={() => { setSearchType('movie_tv'); setSearchResults([]); setSelectedMedia(null) }}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${searchType === 'movie_tv' ? 'bg-[#ff0000] text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>
                      Movie / TV
                    </button>
                    <button type="button" onClick={() => { setSearchType('anime'); setSearchResults([]); setSelectedMedia(null) }}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${searchType === 'anime' ? 'bg-[#ff0000] text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>
                      Anime
                    </button>
                  </div>
                  <input type="text" value={modalSearchQuery} onChange={(e) => setModalSearchQuery(e.target.value)}
                    placeholder={searchType === 'movie_tv' ? "Search TMDB..." : "Search AniList..."}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-full px-5 py-2.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#ff0000] font-normal" />
                  <button type="submit" disabled={isSearching} className="bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-medium px-5 rounded-full text-xs cursor-pointer flex items-center gap-1.5">
                    {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Search</span>
                  </button>
                </form>
                <div className="flex-1 overflow-y-auto bg-zinc-50 border border-zinc-200 rounded-2xl p-3 min-h-[250px]">
                  {isSearching ? (
                    <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#ff0000] animate-spin" /></div>
                  ) : searchError ? (
                    <div className="h-full w-full flex items-center justify-center p-4 text-center"><p className="text-zinc-400 text-xs max-w-xs">{searchError}</p></div>
                  ) : searchResults.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center p-4 text-center text-zinc-400">
                      <div className="flex flex-col items-center gap-1.5"><Sparkles className="w-5 h-5" /><span className="text-[10px] tracking-widest font-normal">Search to find media</span></div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {searchResults.map((item) => (
                        <button key={item.api_id} type="button" onClick={() => setSelectedMedia(item)}
                          className={`w-full text-left p-2 rounded-xl flex items-center gap-3 border transition-all cursor-pointer ${selectedMedia?.api_id === item.api_id ? 'bg-white border-[#ff0000]' : 'bg-transparent border-transparent hover:bg-white hover:border-zinc-200'}`}>
                          <div className="w-10 h-14 bg-zinc-200 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                            {item.poster_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
                            ) : <Film className="w-4 h-4 text-zinc-400" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-medium truncate text-zinc-700">{item.title}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-medium text-zinc-400 bg-white px-1.5 py-0.5 rounded-full border border-zinc-200">
                                {item.type === 'tv' ? 'TV' : item.type === 'movie' ? 'Movie' : 'Anime'}
                              </span>
                              {item.release_year && <span className="text-[9px] text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{item.release_year}</span>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: config */}
              <div className="w-full md:w-72 flex flex-col bg-zinc-50 border border-zinc-200 rounded-2xl p-5 shrink-0 justify-between">
                {selectedMedia ? (
                  <form onSubmit={handleAddItemSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex gap-3 pb-3.5 border-b border-zinc-200">
                        <div className="w-12 h-16 bg-zinc-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          {selectedMedia.poster_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={selectedMedia.poster_url} alt={selectedMedia.title} className="w-full h-full object-cover" />
                          ) : <Film className="w-4 h-4 text-zinc-400" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-[#ff0000] font-medium tracking-widest block">Selected</span>
                          <h4 className="font-medium text-xs text-zinc-700 truncate">{selectedMedia.title}</h4>
                          <span className="text-[10px] text-zinc-400 font-normal mt-0.5 block">
                            {selectedMedia.type === 'tv' ? 'TV' : selectedMedia.type === 'movie' ? 'Movie' : 'Anime'} {selectedMedia.release_year ? `• ${selectedMedia.release_year}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-medium text-zinc-400 tracking-widest block">Status</label>
                        <select value={newItemStatus} onChange={(e: any) => setNewItemStatus(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-normal text-zinc-700 focus:outline-none focus:border-[#ff0000]">
                          <option value="plan_to_watch">Plan to watch</option>
                          <option value="watching">Watching</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-medium text-zinc-400 tracking-widest block">Notes</label>
                        <textarea value={newItemNotes} onChange={(e) => setNewItemNotes(e.target.value)} placeholder="Your thoughts..." rows={3}
                          className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs placeholder-zinc-400 text-zinc-800 resize-none font-normal" />
                      </div>
                    </div>
                    <button type="submit" disabled={isSubmitting}
                      className="w-full bg-[#ff0000] hover:bg-[#d60000] disabled:opacity-80 text-white font-medium py-3 rounded-full text-xs cursor-pointer flex items-center justify-center gap-1.5 mt-4">
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Save to watchlist</span>
                    </button>
                  </form>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-4">
                    <Sparkles className="w-5 h-5 text-zinc-300 mb-2" />
                    <h5 className="text-zinc-500 font-medium text-xs mb-1">Select a result</h5>
                    <p className="text-zinc-400 text-[10px] leading-relaxed max-w-[180px] font-normal">Search and pick a title to configure and save.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- TOAST ---- */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#ff0000] text-white font-medium px-5 py-3 rounded-full z-50 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
