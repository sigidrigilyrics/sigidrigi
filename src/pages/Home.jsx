import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Play, WifiOff, ChevronRight, SlidersHorizontal, Gift,
  Heart, Church, Users, Baby, Landmark, Sparkles, Music, BookOpen, Sunrise, Waves } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { loadCatalog, getCachedCatalog } from '../lib/songs'
import { useMembership, isFreeThisWeek } from '../lib/membership'
import { useRecent } from '../lib/recent'
import CardImage from '../components/CardImage'
import SongRow from '../components/SongRow'
import LoginSheet from '../components/LoginSheet'

// Colour + icon per category (graceful default for any unknown name).
function categoryStyle(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('love') || n.includes('loloma')) return { color: '#ED93B1', Icon: Heart }
  if (n.includes('relig') || n.includes('devot') || n.includes('church') || n.includes('hymn') || n.includes('lotu') || n.includes('gospel')) return { color: '#9B8CFF', Icon: Church }
  if (n.includes('meke')) return { color: '#E0709B', Icon: Users }
  if (n.includes('choir') || n.includes('group')) return { color: '#5BA8F0', Icon: Users }
  if (n.includes('child') || n.includes('kid')) return { color: '#F0B24B', Icon: Baby }
  if (n.includes('classic') || n.includes('histor')) return { color: '#C8A24B', Icon: Landmark }
  if (n.includes('modern') || n.includes('hit') || n.includes('celebr') || n.includes('party') || n.includes('vude')) return { color: '#FFB800', Icon: Sparkles }
  if (n.includes('farewell') || n.includes('isa')) return { color: '#F0997B', Icon: Sunrise }
  if (n.includes('vanua')) return { color: '#7FB069', Icon: Landmark }
  if (n.includes('welcome') || n.includes('bula')) return { color: '#1DC9A0', Icon: Waves }
  if (n.includes('story') || n.includes('legend')) return { color: '#7FB069', Icon: BookOpen }
  return { color: '#00E5A0', Icon: Music }
}

export default function Home() {
  const nav = useNavigate()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [offline, setOffline] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)
  const [showLogin, setShowLogin] = useState(false)
  const { isMember } = useMembership()
  const { recent } = useRecent()
  const heroRef = useRef(null)

  useEffect(() => {
    // Read the user; if null on the first try after a fresh OAuth landing the
    // session may still be settling in the WebView storage, so retry briefly.
    // Without this, the header sat on "S" for guests until a manual refresh.
    let cancelled = false
    async function readUser(attempt = 0) {
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      if (data.user) { setUser(data.user); return }
      if (attempt < 4) setTimeout(() => readUser(attempt + 1), 400)
    }
    readUser()
    // React to login/logout so the header stops offering login the moment the
    // user is authenticated (and shows their initial + routes to Account instead).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    fetchSongs()
    return () => { cancelled = true; sub?.subscription?.unsubscribe?.() }
  }, [])

  async function fetchSongs() {
    setLoading(true)
    setError(null)
    const cached = getCachedCatalog()
    if (cached && cached.length) { setSongs(cached); setLoading(false) }
    const { songs, offline } = await loadCatalog()
    setOffline(offline)
    if (songs.length) setSongs(songs)
    else if (!cached?.length) setError('Could not load songs. Connect to the internet once to download them.')
    setLoading(false)
  }

  const day = Math.floor(Date.now() / 86400000)
  const freeCount = songs.filter(s => isFreeThisWeek(s)).length

  // Featured carousel — a few deterministic daily picks (prefers verified/free)
  const featured = (() => {
    if (!songs.length) return []
    const pool = songs.filter(s => s.verified || s.free)
    const base = pool.length >= 4 ? pool : songs
    const picks = []
    for (let i = 0; i < 4 && i < base.length; i++) picks.push(base[(day * 3 + i * 37) % base.length])
    return picks.filter((s, i, a) => a.findIndex(x => x.id === s.id) === i)
  })()

  // Category tiles with counts
  const categories = (() => {
    const map = new Map()
    songs.forEach(s => { if (s.category) map.set(s.category, (map.get(s.category) || 0) + 1) })
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  })()

  // Recently played (resolve ids → songs)
  const recentSongs = recent.map(id => songs.find(s => s.id === id)).filter(Boolean).slice(0, 6)

  // Discover — a daily-rotating slice of the catalogue
  const discover = (() => {
    if (!songs.length) return []
    const start = (day * 7) % songs.length
    return Array.from({ length: Math.min(8, songs.length) }, (_, i) => songs[(start + i) % songs.length])
  })()

  function onHeroScroll() {
    const el = heroRef.current
    if (!el) return
    setHeroIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '50px 20px 18px' }}>
        <div>
          <p style={{ color: 'var(--text2)', fontSize: 11, letterSpacing: '0.08em' }}>Bula vinaka</p>
          <h1 className="font-playfair" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>Sigidrigi</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => nav('/browse')} aria-label="Search"
            style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
            <Search size={18} />
          </button>
          <button onClick={() => user ? nav('/account') : setShowLogin(true)}
            style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 16, fontFamily: 'Playfair Display, serif' }}>
            {user ? user.email?.[0]?.toUpperCase() : 'S'}
          </button>
        </div>
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

      {loading && <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Loading songs…</div>}
      {error && (
        <div style={{ margin: '0 20px', background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button onClick={fetchSongs} style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, fontSize: 13, padding: '9px 22px', cursor: 'pointer' }}>Try again</button>
        </div>
      )}

      {!loading && !error && songs.length > 0 && (
        <>
          {/* Hero carousel */}
          <div ref={heroRef} onScroll={onHeroScroll}
            style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: 0, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {featured.map((s, i) => (
              <div key={s.id} style={{ flex: '0 0 100%', scrollSnapAlign: 'center', padding: '0 20px' }}>
                <CardImage song={s} radius={24} overlay="full" style={{ height: 250 }}>
                  <div onClick={() => nav(`/song/${s.id}`)} style={{ position: 'absolute', inset: 0, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'pointer' }}>
                    <span style={{ alignSelf: 'flex-start', background: 'rgba(0,229,160,0.9)', color: '#04342C', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '4px 9px', borderRadius: 999, marginBottom: 12 }}>
                      {i === 0 ? 'TODAY’S FEATURED' : 'FEATURED'}
                    </span>
                    <h2 className="font-playfair" style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.02em', marginBottom: 6 }}>{s.title}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 16 }}>{s.category || 'Traditional'} · {s.artist || 'Traditional'}</p>
                    <button onClick={e => { e.stopPropagation(); nav(`/sing/${s.id}`) }}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--accent)', border: 'none', borderRadius: 999, color: '#000', fontWeight: 700, fontSize: 14, padding: '11px 20px', cursor: 'pointer', boxShadow: '0 8px 22px rgba(0,229,160,0.35)' }}>
                      <Play size={16} fill="#000" /> Sing now
                    </button>
                  </div>
                </CardImage>
              </div>
            ))}
          </div>
          {/* Dots */}
          {featured.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
              {featured.map((_, i) => (
                <span key={i} style={{ width: i === heroIndex ? 18 : 6, height: 6, borderRadius: 999, background: i === heroIndex ? 'var(--accent)' : 'var(--bg3)', transition: 'width 0.2s' }} />
              ))}
            </div>
          )}

          {/* Search bar */}
          <div style={{ padding: '20px 20px 6px' }}>
            <button onClick={() => nav('/browse')}
              style={{ width: '100%', background: 'var(--bg2)', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', border: 'none', cursor: 'pointer' }}>
              <Search size={16} color="var(--text3)" />
              <span style={{ color: 'var(--text3)', fontSize: 14, flex: 1, textAlign: 'left' }}>Search songs, artists, or lyrics…</span>
              <SlidersHorizontal size={16} color="var(--accent)" />
            </button>
          </div>

          {/* Recently played */}
          {recentSongs.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 12px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recently played</h3>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
                {recentSongs.map(s => (
                  <div key={s.id} onClick={() => nav(`/song/${s.id}`)} style={{ flexShrink: 0, width: 150, cursor: 'pointer' }}>
                    <CardImage song={s} radius={16} overlay="bottom" style={{ height: 96 }}>
                      <div style={{ position: 'absolute', right: 10, bottom: 10, width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={15} color="#000" fill="#000" />
                      </div>
                    </CardImage>
                    <p style={{ fontWeight: 600, fontSize: 13.5, marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--accent)' }}>{s.category || 'Traditional'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Browse categories */}
          {categories.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, padding: '0 20px 12px' }}>Browse categories</h3>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
                {/* Free-to-sing tile always first */}
                {freeCount > 0 && (
                  <button onClick={() => nav('/browse?free=1')}
                    style={{ flexShrink: 0, width: 118, height: 118, borderRadius: 18, border: '1px solid rgba(0,229,160,0.45)', background: 'linear-gradient(160deg, rgba(0,229,160,0.22), rgba(0,229,160,0.06))', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14, textAlign: 'left' }}>
                    <Gift size={26} color="var(--accent)" />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>Free to sing</p>
                      <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{freeCount} this week</p>
                    </div>
                  </button>
                )}
                {categories.map(({ name, count }) => {
                  const { color, Icon } = categoryStyle(name)
                  return (
                    <button key={name} onClick={() => nav(`/browse?category=${encodeURIComponent(name)}`)}
                      style={{ flexShrink: 0, width: 118, height: 118, borderRadius: 18, border: `1px solid ${color}40`, background: `linear-gradient(160deg, ${color}26, ${color}0d)`, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14, textAlign: 'left' }}>
                      <Icon size={26} color={color} />
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{count} song{count !== 1 ? 's' : ''}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Discover */}
          <div style={{ marginTop: 26, padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Discover</h3>
              <button onClick={() => nav('/browse')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                See all <ChevronRight size={15} />
              </button>
            </div>
            {discover.map(s => (
              <SongRow key={s.id} song={s} isMember={isMember} onClick={() => nav(`/song/${s.id}`)} />
            ))}
          </div>
        </>
      )}

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </div>
  )
}
