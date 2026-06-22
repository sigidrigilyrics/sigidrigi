import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Heart, Share2, Play, Pause, Music, ExternalLink } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { MOCK_SONGS } from '../lib/mockData'
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
  const [track, setTrack] = useState('acoustic')
  const audioRef = useRef(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (!isConfigured) {
        const found = MOCK_SONGS.find(s => s.id === id)
        setSong(found || null)
        if (!found) setError('Song not found')
        setLoading(false)
        return
      }
      const { data, error } = await supabase.from('songs').select('*').eq('id', id).single()
      if (error) setError(error.message)
      else setSong(data)
      setLoading(false)
    }
    load()
  }, [id])

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  function switchTrack(t) {
    const wasPlaying = playing
    if (audioRef.current) { audioRef.current.pause(); setPlaying(false) }
    setTrack(t)
    setCurrentTime(0)
    setDuration(0)
    // Audio src will update via src prop, then auto-play if it was playing
    setTimeout(() => {
      if (wasPlaying && audioRef.current) audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }, 80)
  }

  function fmt(s) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text2)' }}>
      Loading…
    </div>
  )
  if (error) return (
    <div style={{ padding: 20, color: 'var(--danger)' }}>{error}</div>
  )
  if (!song) return null

  const lines = (song.lyrics || '').split('\n')
  const chorusStart = lines.findIndex(l => l.toLowerCase().includes('[chorus]') || l.toLowerCase().includes('chorus:'))

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header + Category row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '52px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', flexShrink: 0 }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
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
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
            <Heart size={16} />
          </button>
          <button style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
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

      {/* Audio player */}
      {(song.audio_url || song.audio_url_full) ? (() => {
        const hasAcoustic = !!song.audio_url
        const hasFull = !!song.audio_url_full
        const hasBoth = hasAcoustic && hasFull
        const activeSrc = track === 'full' && hasFull ? song.audio_url_full : song.audio_url
        const trackLabel = track === 'full' ? 'Full instrumental' : 'Acoustic guitar'
        const trackColor = track === 'full' ? 'var(--gold)' : 'var(--accent)'
        return (
          <div style={{ margin: '0 20px 16px', background: 'var(--bg1)', borderRadius: 18, padding: '16px 18px' }}>
            <audio key={activeSrc} ref={audioRef} src={activeSrc}
              onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
              onLoadedMetadata={e => setDuration(e.target.duration)}
              onEnded={() => setPlaying(false)} />

            {/* Track toggle — only show when both tracks available */}
            {hasBoth && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { id: 'acoustic', label: 'Acoustic', color: 'var(--accent)' },
                  { id: 'full', label: 'Full Instrumental', color: 'var(--gold)' },
                ].map(t => (
                  <button key={t.id} onClick={() => switchTrack(t.id)}
                    style={{
                      flex: 1, background: track === t.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                      border: `1.5px solid ${track === t.id ? t.color : 'var(--border)'}`,
                      borderRadius: 10, color: track === t.id ? t.color : 'var(--text2)',
                      fontWeight: 700, fontSize: 11, padding: '8px 4px', cursor: 'pointer',
                      letterSpacing: '0.03em',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <button onClick={togglePlay}
                style={{ width: 50, height: 50, borderRadius: '50%', background: trackColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 22px rgba(0,0,0,0.3)`, flexShrink: 0 }}>
                {playing ? <Pause size={20} color="#000" /> : <Play size={20} color="#000" fill="#000" />}
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: trackColor }}>{trackLabel}</p>
                <p style={{ color: 'var(--text2)', fontSize: 12 }}>{fmt(currentTime)} / {fmt(duration)}</p>
              </div>
            </div>
            <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'var(--bg3)' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: trackColor, borderRadius: 2, transition: 'width 0.2s' }} />
            </div>
          </div>
        )
      })() : null}

      {/* Sing Mode CTA */}
      {song.free ? (
        <div style={{ margin: '0 20px 20px' }}>
          <button onClick={() => nav(`/sing/${song.id}?track=${track}`)}
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

      {/* Reference link */}
      {song.reference_url && (
        <div style={{ margin: '0 20px 20px' }}>
          <a href={song.reference_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', background: 'rgba(255,0,0,0.1)', border: '1.5px solid rgba(255,0,0,0.4)', borderRadius: 14, color: '#ff4444', fontWeight: 700, fontSize: 14, padding: '13px', textDecoration: 'none' }}>
            <ExternalLink size={18} />
            Listen to reference
          </a>
        </div>
      )}

      {/* Lyrics */}
      <div style={{ padding: '0 20px' }}>
        {song.free ? (
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
