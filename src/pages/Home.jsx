import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Play, Lock, Star } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { MOCK_SONGS } from '../lib/mockData'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSubscribe, setShowSubscribe] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    fetchSongs()
  }, [])

  async function fetchSongs() {
    setLoading(true)
    setError(null)
    if (!isConfigured) {
      setSongs(MOCK_SONGS)
      setFeatured(MOCK_SONGS.find(s => s.free) || MOCK_SONGS[0])
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('songs').select('*').order('title')
    if (error) { setError(error.message); setLoading(false); return }
    setSongs(data || [])
    const feat = (data || []).find(s => s.free) || data?.[0]
    setFeatured(feat)
    setLoading(false)
  }

  const filtered = songs.filter(s =>
    !query || s.title?.toLowerCase().includes(query.toLowerCase()) || s.artist?.toLowerCase().includes(query.toLowerCase())
  )
  const freeSongs = filtered.filter(s => s.free)
  const lockedSongs = filtered.filter(s => !s.free)

  function handleLocked(song) {
    if (!user) { setShowLogin(true); return }
    setShowSubscribe(true)
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--text2)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>BULA VINAKA</p>
          <h1 className="font-playfair" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>Sigidrigi</h1>
        </div>
        <button onClick={() => setShowLogin(true)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 15, fontFamily: 'Playfair Display, serif' }}>
          {user ? user.email?.[0]?.toUpperCase() : 'S'}
        </button>
      </div>

      {/* Setup banner */}
      {!isConfigured && (
        <div style={{ margin: '0 20px 16px', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.25)', borderRadius: 14, padding: '12px 14px', fontSize: 12, color: 'var(--gold)' }}>
          <strong>Demo mode</strong> — add your Supabase credentials to <code>.env.local</code> to go live.
        </div>
      )}

      {/* Featured hero */}
      {featured && (
        <div style={{ margin: '0 20px 20px', borderRadius: 22, background: 'linear-gradient(150deg,#0c2b22,#0A0A0A)', border: '1px solid rgba(0,229,160,0.18)', padding: 20, position: 'relative', overflow: 'hidden' }}
          className="tapa-accent">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ background: 'rgba(0,229,160,0.15)', color: 'var(--accent)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '4px 8px', borderRadius: 999 }}>FEATURED</span>
              {featured.verified && (
                <span style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--accent)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 3 }}>
                  ✓ VERIFIED
                </span>
              )}
            </div>
          </div>
          <h2 className="font-playfair" style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 8 }}>
            {featured.title}
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 18 }}>
            {featured.category} · {featured.artist || 'Traditional'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => nav(`/song/${featured.id}`)}
              style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(0,229,160,0.3)', flexShrink: 0 }}>
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
      <div style={{ padding: '0 20px', marginBottom: 22 }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px' }}>
          <Search size={16} color="var(--text3)" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search the archive…"
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, flex: 1, fontFamily: 'Inter, sans-serif' }} />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Loading songs…</div>
      )}
      {error && (
        <div style={{ margin: '0 20px', background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: 16, color: 'var(--danger)', fontSize: 14 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Free songs */}
          <div style={{ padding: '0 20px', marginBottom: 24 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 10 }}>Free this week</h3>
            {freeSongs.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No free songs yet.</p>}
            {freeSongs.map(song => (
              <button key={song.id} onClick={() => nav(`/song/${song.id}`)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="font-playfair" style={{ color: 'var(--accent)', fontSize: 18, fontWeight: 700 }}>{song.title?.[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{song.category} · {song.artist || 'Traditional'}</p>
                </div>
                <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0 }}>FREE</span>
              </button>
            ))}
          </div>

          {/* Members archive */}
          <div style={{ padding: '0 20px', marginBottom: 24 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 10 }}>Members archive</h3>
            {lockedSongs.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>Archive empty.</p>}
            {lockedSongs.map(song => (
              <button key={song.id} onClick={() => handleLocked(song)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', textAlign: 'left', opacity: 0.72 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="font-playfair" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: 700 }}>{song.title?.[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{song.category} · {song.artist || 'Traditional'}</p>
                </div>
                <Lock size={14} color="var(--gold)" />
              </button>
            ))}
          </div>

          {/* Premium banner */}
          <div style={{ margin: '0 20px 24px', background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Star size={22} color="var(--gold)" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 15 }}>Go Premium — $5/mo</p>
              <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>Full archive + instrumentals</p>
            </div>
            <button onClick={() => setShowSubscribe(true)}
              style={{ background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 16px', cursor: 'pointer', flexShrink: 0 }}>
              Join
            </button>
          </div>
        </>
      )}

      {showSubscribe && <SubscribeSheet onClose={() => setShowSubscribe(false)} />}
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </div>
  )
}
