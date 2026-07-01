import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Heart, Share2, Play, Pause, Music, ExternalLink } from 'lucide-react'
import { loadSong, findCachedSong, getCachedCatalog, loadCatalog } from '../lib/songs'
import { pushRecent } from '../lib/recent'
import { useFavorites } from '../lib/favorites'
import { useMembership, canAccess, LOCK_CONTENT } from '../lib/membership'
import SubscribeSheet from '../components/SubscribeSheet'

export default function Song() {
  const { id } = useParams()
  const nav = useNavigate()
  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showSubscribe, setShowSubscribe] = useState(false)
  const [shared, setShared] = useState(false)
  const audioRef = useRef(null)
  const { isFavorite, toggle } = useFavorites()
  const { isMember, loading: membershipLoading } = useMembership()
  // The free-this-week set needs the whole catalogue cached. On a cold deep-link
  // it may be empty, so warm it before deciding access (else free songs misfire).
  const [catalogReady, setCatalogReady] = useState(!!getCachedCatalog())

  async function handleShare() {
    const url = `${window.location.origin}/song/${id}`
    const data = { title: song?.title, text: `${song?.title} — Sigidrigi`, url }
    try {
      if (navigator.share) await navigator.share(data)
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1800) }
    } catch { /* user cancelled share */ }
  }

  useEffect(() => {
    pushRecent(id)
    async function load() {
      setLoading(true)
      const cached = findCachedSong(id)
      if (cached) { setSong(cached); setLoading(false) }
      const { song } = await loadSong(id)
      if (song) setSong(song)
      else if (!cached) setError('Song not found')
      setLoading(false)
    }
    load()
  }, [id])

  // Never let a stalled catalogue fetch keep the loading gate up forever — proceed
  // after a few seconds regardless (freeness may be unknown, but nothing hangs).
  useEffect(() => {
    if (catalogReady) return
    let settled = false
    loadCatalog().then(() => { settled = true; setCatalogReady(true) })
    const t = setTimeout(() => { if (!settled) setCatalogReady(true) }, 4000)
    return () => clearTimeout(t)
  }, [catalogReady])

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  function fmt(s) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  if (loading || (LOCK_CONTENT && (!catalogReady || membershipLoading))) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text2)' }}>
      Loading…
    </div>
  )
  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
      <button onClick={() => { setError(null); setLoading(true); loadSong(id).then(({ song: s }) => { if (s) setSong(s); setLoading(false) }) }}
        style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, fontSize: 14, padding: '10px 24px', cursor: 'pointer' }}>
        Try again
      </button>
    </div>
  )
  if (!song) return null

  const lines = (song.lyrics || '').split('\n')
  const chorusStart = lines.findIndex(l => l.toLowerCase().includes('[chorus]') || l.toLowerCase().includes('chorus:'))

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '52px 20px 12px' }}>
        <button onClick={() => nav(-1)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {song.category && (
            <span style={{ border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 999 }}>
              {song.category.toUpperCase()}
            </span>
          )}
          {song.verified && (
            <span style={{ border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 999 }}>
              ✓ VERIFIED
            </span>
          )}
          <button onClick={() => toggle(song.id)}
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isFavorite(song.id) ? 'var(--accent)' : 'var(--text)' }}>
            <Heart size={16} fill={isFavorite(song.id) ? 'var(--accent)' : 'none'} />
          </button>
          <button onClick={handleShare}
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: shared ? 'var(--accent)' : 'var(--text)' }}>
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Title block */}
      <div style={{ padding: '0 20px 20px' }}>
        <h1 className="font-playfair" style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 8 }}>
          {song.title}
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 18 }}>
          Traditional · {song.composer || 'Composer unknown'}
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Province', song.province], ['Source', song.source], ['BPM', song.bpm]].map(([label, val]) => val ? (
            <div key={label}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{val}</p>
            </div>
          ) : null)}
        </div>
      </div>

      {/* Audio player — single MP3 fallback (most songs use the hidden YouTube instrumental in Sing Mode) */}
      {song.audio_url && (
        <div style={{ margin: '0 20px 16px', background: 'var(--bg1)', borderRadius: 18, padding: '16px 18px' }}>
          <audio key={song.audio_url} ref={audioRef} src={song.audio_url}
            onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
            onLoadedMetadata={e => setDuration(e.target.duration)}
            onEnded={() => setPlaying(false)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <button onClick={togglePlay}
              style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 22px rgba(0,0,0,0.3)`, flexShrink: 0 }}>
              {playing ? <Pause size={20} color="#000" /> : <Play size={20} color="#000" fill="#000" />}
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: 'var(--accent)' }}>Audio</p>
              <p style={{ color: 'var(--text2)', fontSize: 12 }}>{fmt(currentTime)} / {fmt(duration)}</p>
            </div>
          </div>
          <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'var(--bg3)' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.2s' }} />
          </div>
        </div>
      )}

      {/* Sing Mode CTA */}
      {canAccess(song, isMember) ? (
        <div style={{ margin: '0 20px 20px' }}>
          <button onClick={() => nav(`/sing/${song.id}`)}
            style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 14, color: '#000', fontWeight: 700, fontSize: 15, padding: '15px', cursor: 'pointer', boxShadow: '0 8px 28px rgba(0,229,160,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Music size={18} />
            Enter Sing Mode
          </button>
        </div>
      ) : (
        <div style={{ margin: '0 20px 20px' }}>
          <button onClick={() => setShowSubscribe(true)}
            style={{ width: '100%', background: 'linear-gradient(135deg,var(--gold),#e6a300)', border: 'none', borderRadius: 14, color: '#000', fontWeight: 700, fontSize: 15, padding: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            🔒 Unlock Sing Mode
          </button>
        </div>
      )}

      {/* Reference link — specific video if set, else a YouTube search for this song */}
      {(() => {
        const hasRef = !!song.reference_url
        const href = hasRef
          ? song.reference_url
          : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.artist || ''} fijian`)}`
        return (
          <div style={{ margin: '0 20px 20px' }}>
            <a href={href} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', background: 'rgba(255,0,0,0.1)', border: '1.5px solid rgba(255,0,0,0.4)', borderRadius: 14, color: '#ff4444', fontWeight: 700, fontSize: 14, padding: '13px', textDecoration: 'none' }}>
              <ExternalLink size={18} />
              {hasRef ? 'Listen to reference' : 'Find on YouTube'}
            </a>
          </div>
        )
      })()}

      {/* Artist social link */}
      {song.social_url && (() => {
        const url = song.social_url
        const lower = url.toLowerCase()
        const platform = lower.includes('instagram') ? 'Instagram'
          : lower.includes('facebook') || lower.includes('fb.com') ? 'Facebook'
          : lower.includes('tiktok') ? 'TikTok'
          : lower.includes('twitter') || lower.includes('x.com') ? 'X (Twitter)'
          : lower.includes('youtube') ? 'YouTube'
          : 'Social'
        const color = platform === 'Instagram' ? '#e1306c'
          : platform === 'Facebook' ? '#1877f2'
          : platform === 'TikTok' ? '#69c9d0'
          : platform === 'X (Twitter)' ? '#fff'
          : platform === 'YouTube' ? '#ff0000'
          : 'var(--accent)'
        const bg = `${color}18`
        const border = `${color}55`
        return (
          <div style={{ margin: '0 20px 20px' }}>
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', background: bg, border: `1.5px solid ${border}`, borderRadius: 14, color, fontWeight: 700, fontSize: 14, padding: '13px', textDecoration: 'none' }}>
              <ExternalLink size={18} />
              Follow {song.artist || 'Artist'} on {platform}
            </a>
          </div>
        )
      })()}

      {/* Lyrics */}
      <div style={{ padding: '0 20px' }}>
        {canAccess(song, isMember) ? (
          <>
            {lines.map((line, i) => {
              const isChorusHeader = line.toLowerCase().includes('[chorus]') || line.toLowerCase().includes('chorus:')
              const inChorus = i > chorusStart && chorusStart >= 0 && (i < lines.findIndex((l, j) => j > chorusStart && l.startsWith('[') && !l.toLowerCase().includes('chorus')) || lines.findIndex((l, j) => j > chorusStart && l.startsWith('[') && !l.toLowerCase().includes('chorus')) === -1)

              if (isChorusHeader) return (
                <div key={i} style={{ background: 'rgba(0,229,160,0.07)', borderLeft: '3px solid var(--accent)', borderRadius: '0 10px 10px 0', padding: '12px 14px', margin: '10px 0 2px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', display: 'block', marginBottom: 4 }}>CHORUS</span>
                </div>
              )
              if (inChorus) return (
                <div key={i} style={{ background: 'rgba(0,229,160,0.07)', borderLeft: '3px solid var(--accent)', padding: '2px 14px' }}>
                  <p className="font-playfair" style={{ fontSize: 18, lineHeight: 1.85, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic' }}>{line || ' '}</p>
                </div>
              )
              return (
                <p key={i} className="font-playfair" style={{ fontSize: 18, lineHeight: 1.85, color: 'rgba(255,255,255,0.9)', minHeight: '1em' }}>{line || ' '}</p>
              )
            })}
          </>
        ) : (
          <>
            {lines.slice(0, 6).map((line, i) => (
              <p key={i} className="font-playfair" style={{ fontSize: 18, lineHeight: 1.85, color: 'rgba(255,255,255,0.9)' }}>{line}</p>
            ))}
            <div style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))', height: 80, marginTop: -60, position: 'relative', zIndex: 2 }} />
            <div style={{ textAlign: 'center', paddingTop: 10 }}>
              {lines.length > 6 && (
                <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>+ {lines.length - 6} more lines</p>
              )}
              <button onClick={() => setShowSubscribe(true)} style={{ background: 'none', border: '1px solid var(--gold)', borderRadius: 10, color: 'var(--gold)', fontWeight: 600, fontSize: 14, padding: '10px 24px', cursor: 'pointer' }}>
                🔒 Subscribe to read full lyrics
              </button>
            </div>
          </>
        )}
      </div>

      {showSubscribe && <SubscribeSheet onClose={() => setShowSubscribe(false)} />}
    </div>
  )
}
