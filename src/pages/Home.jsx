import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Play, Lock, Star, WifiOff, X } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { loadCatalog, getCachedCatalog } from '../lib/songs'
import { useMembership, canAccess, LOCK_CONTENT } from '../lib/membership'
import SubscribeSheet from '../components/SubscribeSheet'
import LoginSheet from '../components/LoginSheet'

function Equalizer() {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
      {[10, 14, 8, 12, 7].map((h, i) => (
        <div key={i} className="eq-bar" style={{ width: 3, height: h, background: 'var(--accent)', borderRadius: 2 }} />
      ))}
    </div>
  )
}

export default function Home() {
  const nav = useNavigate()
  const [songs, setSongs] = useState([])
  const [featured, setFeatured] = useState(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSubscribe, setShowSubscribe] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [user, setUser] = useState(null)
  const [offline, setOffline] = useState(false)
  const { isMember } = useMembership()
  const searchRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    fetchSongs()
  }, [])

  async function fetchSongs() {
    setLoading(true)
    setError(null)
    const cached = getCachedCatalog()
    if (cached && cached.length) {
      setSongs(cached)
      setFeatured(pickFeatured(cached))
      setLoading(false)
    }
    const { songs, offline } = await loadCatalog()
    setOffline(offline)
    if (songs.length) {
      setSongs(songs)
      setFeatured(pickFeatured(songs))
    } else if (!cached?.length) {
      setError('Could not load songs. Connect to the internet once to download them.')
    }
    setLoading(false)
  }

  function pickFeatured(list) {
    // Pick a random song each session — rotate daily using day-of-year as seed
    const day = Math.floor(Date.now() / 86400000)
    return list[day % list.length] || list[0]
  }

  const categories = ['All', ...Array.from(new Set(songs.map(s => s.category).filter(Boolean))).sort()]

  const filtered = songs.filter(s => {
    const matchQuery = !query ||
      s.title?.toLowerCase().includes(query.toLowerCase()) ||
      s.artist?.toLowerCase().includes(query.toLowerCase()) ||
      s.composer?.toLowerCase().includes(query.toLowerCase())
    const matchCat = activeCategory === 'All' || s.category === activeCategory
    return matchQuery && matchCat
  })

  function handleSong(song) {
    if (canAccess(song, isMember)) { nav(`/song/${song.id}`); return }
    if (!user) { setShowLogin(true); return }
    setShowSubscribe(true)
  }

  function clearSearch() {
    setQuery('')
    searchRef.current?.focus()
  }

  const isSearching = query.length > 0

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--text2)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>BULA VINAKA</p>
          <h1 className="font-playfair" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>Sigidrigi</h1>
        </div>
        <button onClick={() => user ? nav('/account') : setShowLogin(true)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 15, fontFamily: 'Playfair Display, serif' }}>
          {user ? user.email?.[0]?.toUpperCase() : 'S'}
        </button>
      </div>

      {/* Banners */}
      {!isConfigured && (
        <div style={{ margin: '0 20px 16px', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.25)', borderRadius: 14, padding: '12px 14px', fontSize: 12, color: 'var(--gold)' }}>
          <strong>Demo mode</strong> — add your Supabase credentials to <code>.env.local</code> to go live.
        </div>
      )}
      {offline && (
        <div style={{ margin: '0 20px 16px', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.25)', borderRadius: 14, padding: '10px 14px', fontSize: 12, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <WifiOff size={14} /> Offline — showing your saved songs
        </div>
      )}

      {/* Featured hero — hidden while searching */}
      {featured && !isSearching && (
        <div style={{ margin: '0 20px 20px', borderRadius: 22, background: 'linear-gradient(150deg,#0c2b22,#0A0A0A)', border: '1px solid rgba(0,229,160,0.18)', padding: 20, position: 'relative', overflow: 'hidden' }}
          className="tapa-accent">
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <span style={{ background: 'rgba(0,229,160,0.15)', color: 'var(--accent)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '4px 8px', borderRadius: 999 }}>FEATURED</span>
            {featured.verified && (
              <span style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--accent)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 8px', borderRadius: 999 }}>✓ VERIFIED</span>
            )}
          </div>
          <h2 className="font-playfair" style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}>
            {featured.title}
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 18 }}>
            {featured.category} · {featured.artist || 'Traditional'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => handleSong(featured)}
              style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(0,229,160,0.3)', flexShrink: 0 }}>
              <Play size={22} color="#000" fill="#000" />
            </button>
            <div>
              <button onClick={() => nav(`/sing/${featured.id}`)}
                style={{ background: 'none', border: 'none', color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                Enter Sing Mode
                <Equalizer />
              </button>
              <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 3 }}>BPM auto-scroll</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '0 20px', marginBottom: 14 }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px' }}>
          <Search size={16} color="var(--text3)" />
          <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search songs, artists…"
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, flex: 1, fontFamily: 'Inter, sans-serif' }} />
          {query && (
            <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 0 }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Category chips — hidden while searching */}
      {!isSearching && songs.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 18, overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0, background: activeCategory === cat ? 'var(--accent)' : 'var(--bg2)',
                border: 'none', borderRadius: 999, color: activeCategory === cat ? '#000' : 'var(--text2)',
                fontWeight: 700, fontSize: 12, padding: '7px 14px', cursor: 'pointer',
                letterSpacing: '0.04em', whiteSpace: 'nowrap',
                transition: 'background 0.15s, color 0.15s'
              }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Loading songs…</div>}
      {error && (
        <div style={{ margin: '0 20px', background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: 16, color: 'var(--danger)', fontSize: 14 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Song count header */}
          <div style={{ padding: '0 20px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase' }}>
              {isSearching ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : activeCategory === 'All' ? `Archive · ${songs.length} songs` : activeCategory}
            </h3>
            {activeCategory !== 'All' && !isSearching && (
              <button onClick={() => setActiveCategory('All')}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {/* Song list */}
          <div style={{ padding: '0 20px', marginBottom: 24 }}>
            {filtered.length === 0 && (
              <p style={{ color: 'var(--text3)', fontSize: 14, paddingTop: 8 }}>No songs found.</p>
            )}
            {filtered.map(song => {
              const accessible = canAccess(song, isMember)
              return (
                <button key={song.id} onClick={() => handleSong(song)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="font-playfair" style={{ color: accessible ? 'var(--accent)' : 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: 700 }}>{song.title?.[0]}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{song.category}{song.artist ? ` · ${song.artist}` : ''}</p>
                  </div>
                  {!accessible && LOCK_CONTENT && <Lock size={14} color="var(--gold)" style={{ flexShrink: 0 }} />}
                  {song.instrumental_url && accessible && (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>♪</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Premium banner — only show when not a member */}
          {!isMember && (
            <div style={{ margin: '0 20px 24px', background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Star size={22} color="var(--gold)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>Join the archive — $5/mo</p>
                <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>Support Fijian music preservation</p>
              </div>
              <button onClick={() => setShowSubscribe(true)}
                style={{ background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 16px', cursor: 'pointer', flexShrink: 0 }}>
                Join
              </button>
            </div>
          )}
        </>
      )}

      {showSubscribe && <SubscribeSheet onClose={() => setShowSubscribe(false)} />}
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </div>
  )
}
