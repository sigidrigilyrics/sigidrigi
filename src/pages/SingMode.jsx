import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { X, SkipBack, Play, Pause, SkipForward, Minus, Plus, Music } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { MOCK_SONGS } from '../lib/mockData'

export default function SingMode() {
  const { id } = useParams()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(72)
  const [multiplier, setMultiplier] = useState(0.6)
  const [currentLine, setCurrentLine] = useState(0)
  const [track, setTrack] = useState(searchParams.get('track') || 'acoustic')
  const [audioError, setAudioError] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const scrollRef = useRef(null)
  const rafRef = useRef(null)
  const scrollPosRef = useRef(0)
  const audioRef = useRef(null)
  const hideTimerRef = useRef(null)

  useEffect(() => {
    async function load() {
      let data, error
      if (!isConfigured) {
        data = MOCK_SONGS.find(s => s.id === id) || null
        if (!data) error = { message: 'Song not found' }
      } else {
        ({ data, error } = await supabase.from('songs').select('*').eq('id', id).single())
      }
      if (error) setError(error.message)
      else { setSong(data); if (data?.bpm) setBpm(data.bpm) }
      setLoading(false)
    }
    load()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [id])

  const lineHeight = 52

  // Sync audio with play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.play().catch(() => setAudioError(true))
    } else {
      audio.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return }
    const scrollSpeed = (bpm / 60) * lineHeight * 0.5 * multiplier

    let last = null
    function step(ts) {
      if (!last) last = ts
      const dt = (ts - last) / 1000
      last = ts

      const audio = audioRef.current
      const introSecs = song?.intro || 0
      if (audio && !audio.paused && audio.currentTime > 0) {
        // Lock scroll to audio time, offset by intro duration
        scrollPosRef.current = Math.max(0, (audio.currentTime - introSecs) * scrollSpeed)
      } else {
        // No audio — accumulate independently (intro already waited via pause at start)
        scrollPosRef.current += scrollSpeed * dt
      }

      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollPosRef.current
        let line = Math.floor(scrollPosRef.current / lineHeight)
        // Advance past section headers so highlight always lands on a lyric
        while (line < lines.length && isHeaderLine(lines[line])) line++
        setCurrentLine(line)
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying, bpm, multiplier])

  // Auto-hide controls when playing, show when paused or tapped
  useEffect(() => {
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 2000)
    } else {
      clearTimeout(hideTimerRef.current)
      setShowControls(true)
    }
    return () => clearTimeout(hideTimerRef.current)
  }, [isPlaying])

  function handleScreenTap() {
    setShowControls(true)
    clearTimeout(hideTimerRef.current)
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 2000)
    }
  }

  function handleRestart() {
    scrollPosRef.current = 0
    setCurrentLine(0)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      if (isPlaying) audioRef.current.play().catch(() => {})
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#070707', color: 'var(--text2)' }}>Loading…</div>
  if (error) return <div style={{ padding: 20, background: '#070707', color: 'var(--danger)', height: '100vh' }}>{error}</div>
  if (!song) return null

  const lines = (song.lyrics || '').split('\n').filter(Boolean)
  const isHeaderLine = (line) => /^(verse|chorus|bridge|outro|pre-?chorus|intro|hook|\[)/i.test(line.trim())
  const hasAcoustic = !!song.audio_url
  const hasFull = !!song.audio_url_full
  const hasBoth = hasAcoustic && hasFull
  const activeAudioUrl = track === 'full' && hasFull ? song.audio_url_full : song.audio_url
  const hasAudio = !!activeAudioUrl

  function switchTrack(t) {
    const wasPlaying = isPlaying
    setIsPlaying(false)
    setAudioError(false)
    setTrack(t)
    // Re-play after src update if was playing
    if (wasPlaying) setTimeout(() => setIsPlaying(true), 80)
  }

  return (
    <div onClick={handleScreenTap} style={{ background: '#070707', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Hidden audio element — plays instrumental in sync with scroll */}
      {hasAudio && (
        <audio key={activeAudioUrl} ref={audioRef} src={activeAudioUrl}
          onError={() => setAudioError(true)} preload="auto" />
      )}

      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '52px 20px 20px', background: 'linear-gradient(to bottom, rgba(7,7,7,0.9), transparent)', opacity: showControls ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: showControls ? 'auto' : 'none' }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <X size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="font-playfair" style={{ fontSize: 18, fontWeight: 600 }}>{song.title}</span>
          {hasAudio && !audioError && (() => {
            const c = track === 'full' ? 'var(--gold)' : 'var(--accent)'
            return (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: `rgba(0,0,0,0.3)`, border: `1px solid ${c}44`, borderRadius: 999, padding: '3px 8px' }}>
                {isPlaying ? (
                  <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} className="eq-bar" style={{ width: 2, background: c, borderRadius: 1, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                ) : (
                  <Music size={10} color={c} />
                )}
                <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: '0.05em' }}>
                  {track === 'full' ? 'FULL' : 'ACOUSTIC'}
                </span>
              </span>
            )
          })()}
        </div>
        <div style={{ width: 20 }} />
      </div>

      {/* Lyrics scroll — full screen */}
      <div ref={scrollRef}
        style={{ position: 'absolute', inset: 0, overflowY: 'hidden', padding: '20px 20px 20px', textAlign: 'center' }}>
        {/* Spacer so first line starts in center */}
        <div style={{ height: 180 }} />
        {lines.map((line, i) => {
          const isCurrent = i === currentLine
          const isNext = i === currentLine + 1
          const isPast = i < currentLine
          const isHeader = isHeaderLine(line)
          if (isHeader) return (
            <p key={i} style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              lineHeight: `${lineHeight}px`, color: 'rgba(255,255,255,0.2)', marginBottom: 0,
            }}>{line}</p>
          )
          return (
            <p key={i} className="font-playfair"
              style={{
                fontSize: isCurrent || isNext ? 34 : 26,
                fontWeight: isCurrent ? 800 : 600,
                lineHeight: `${lineHeight}px`,
                color: isCurrent ? 'var(--accent)' : isNext ? 'var(--text)' : 'rgba(255,255,255,0.25)',
                textShadow: isCurrent ? '0 0 30px rgba(0,229,160,0.4)' : 'none',
                transition: 'all 0.3s ease',
                marginBottom: 0,
              }}>
              {line}
            </p>
          )
        })}
        <div style={{ height: 200 }} />
      </div>

      {/* Control dock */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, background: 'linear-gradient(to top, rgba(7,7,7,0.98) 70%, transparent)', padding: '30px 20px 36px', opacity: showControls ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: showControls ? 'auto' : 'none' }}>
        {/* Track selector — only when both tracks available */}
        {hasBoth && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[
              { id: 'acoustic', label: 'Acoustic', color: 'var(--accent)' },
              { id: 'full', label: 'Full Instrumental', color: 'var(--gold)' },
            ].map(t => (
              <button key={t.id} onClick={() => switchTrack(t.id)}
                style={{
                  flex: 1, background: track === t.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: `1.5px solid ${track === t.id ? t.color : 'var(--border)'}`,
                  borderRadius: 10, color: track === t.id ? t.color : 'var(--text3)',
                  fontWeight: 700, fontSize: 11, padding: '8px 4px', cursor: 'pointer',
                  letterSpacing: '0.03em',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        {/* BPM + speed row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: '10px 14px', minWidth: 80 }}>
            <span className="font-playfair" style={{ color: 'var(--gold)', fontSize: 26, fontWeight: 700, display: 'block', lineHeight: 1 }}>{bpm}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)' }}>BPM</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setBpm(b => Math.max(40, b - 1))} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}><Minus size={14} /></button>
            <button onClick={() => setBpm(b => Math.min(200, b + 1))} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}><Plus size={14} /></button>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>Scroll speed</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{multiplier.toFixed(1)}×</span>
            </div>
            <input type="range" min="0.2" max="2" step="0.1" value={multiplier}
              onChange={e => setMultiplier(parseFloat(e.target.value))}
              style={{ accentColor: 'var(--accent)' }} />
          </div>
        </div>

        {/* Audio error */}
        {audioError && (
          <p style={{ fontSize: 11, color: 'var(--danger)', textAlign: 'center', marginBottom: 10 }}>Could not load instrumental</p>
        )}

        {/* Transport */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
          <button onClick={handleRestart}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
            <SkipBack size={24} />
          </button>
          <button onClick={() => setIsPlaying(p => !p)}
            style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(0,229,160,0.4)' }}>
            {isPlaying ? <Pause size={26} color="#000" /> : <Play size={26} color="#000" fill="#000" />}
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
            <SkipForward size={24} />
          </button>
        </div>
      </div>
    </div>
  )
}
