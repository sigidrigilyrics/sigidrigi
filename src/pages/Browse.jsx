import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, ChevronLeft, Mic2, Gift } from 'lucide-react'
import { loadCatalog, getCachedCatalog } from '../lib/songs'
import { useMembership, isFreeThisWeek } from '../lib/membership'
import SongRow from '../components/SongRow'

// Unified browse/search — search box + category chips + filtered list.
// Reads ?q= and ?category= from the URL (set by Home's search bar and tiles).
export default function Browse() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [songs, setSongs] = useState(() => getCachedCatalog() || [])
  const [query, setQuery] = useState(params.get('q') || '')
  const [category, setCategory] = useState(params.get('category') || 'All')
  const [freeOnly, setFreeOnly] = useState(params.get('free') === '1')
  const { isMember } = useMembership()
  const inputRef = useRef(null)

  useEffect(() => { loadCatalog().then(({ songs }) => { if (songs.length) setSongs(songs) }) }, [])
  useEffect(() => { if (!params.get('category')) inputRef.current?.focus() }, [])

  // Keep the URL in sync so back/forward and deep links work
  useEffect(() => {
    const next = {}
    if (query) next.q = query
    if (category !== 'All') next.category = category
    if (freeOnly) next.free = '1'
    setParams(next, { replace: true })
  }, [query, category, freeOnly])

  const categories = ['All', ...Array.from(new Set(songs.map(s => s.category).filter(Boolean))).sort()]

  const filtered = songs.filter(s => {
    const q = query.toLowerCase()
    const matchQuery = !q || s.title?.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q) || s.composer?.toLowerCase().includes(q)
    const matchCat = category === 'All' || s.category === category
    const matchFree = !freeOnly || isFreeThisWeek(s)
    return matchQuery && matchCat && matchFree
  })

  return (
    <div style={{ paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '50px 20px 14px' }}>
        <button onClick={() => nav('/')} aria-label="Back"
          style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-playfair" style={{ fontSize: 26, fontWeight: 800 }}>Browse</h1>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          <Search size={16} color="var(--text3)" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search songs, artists, lyrics…"
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, flex: 1, fontFamily: 'Inter, sans-serif' }} />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 0 }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quick links to other browse modes */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px 14px' }}>
        <button onClick={() => nav('/artists')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg2)', border: 'none', borderRadius: 999, color: 'var(--text2)', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', cursor: 'pointer' }}>
          <Mic2 size={14} /> By artist
        </button>
        <button onClick={() => nav('/index')} style={{ background: 'var(--bg2)', border: 'none', borderRadius: 999, color: 'var(--text2)', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', cursor: 'pointer' }}>
          A–Z index
        </button>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 16px', scrollbarWidth: 'none' }}>
        <button onClick={() => setFreeOnly(f => !f)}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: freeOnly ? 'var(--accent)' : 'var(--bg2)', border: '1px solid rgba(0,229,160,0.4)', borderRadius: 999, color: freeOnly ? '#000' : 'var(--accent)', fontWeight: 700, fontSize: 12, padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Gift size={13} /> Free this week
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            style={{ flexShrink: 0, background: category === cat ? 'var(--accent)' : 'var(--bg2)', border: 'none', borderRadius: 999, color: category === cat ? '#000' : 'var(--text2)', fontWeight: 700, fontSize: 12, padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ padding: '0 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 6 }}>
          {filtered.length} song{filtered.length !== 1 ? 's' : ''}
        </p>
        {filtered.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14, paddingTop: 8 }}>No songs found.</p>}
        {filtered.map(s => (
          <SongRow key={s.id} song={s} isMember={isMember} onClick={() => nav(`/song/${s.id}`)} />
        ))}
      </div>
    </div>
  )
}
