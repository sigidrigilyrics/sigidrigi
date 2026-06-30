import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, SkipBack, Play, Pause, SkipForward, Minus, Plus, Music, Timer } from 'lucide-react'
import { loadSong, findCachedSong, getCachedCatalog, loadCatalog } from '../lib/songs'
import { pushRecent } from '../lib/recent'
import { getYouTubeId, loadYouTubeAPI } from '../lib/youtube'
import { useMembership, canAccess, LOCK_CONTENT } from '../lib/membership'

export default function SingMode() {
  const { id } = useParams()
  const nav = useNavigate()
  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(72)
  const [multiplier, setMultiplier] = useState(0.6)
  const [currentLine, setCurrentLine] = useState(0)
  const [audioError, setAudioError] = useState(false)
  const [ytFailed, setYtFailed] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [ytReady, setYtReady] = useState(false)
  const [scrollStarted, setScrollStarted] = useState(false)
  const scrollRef = useRef(null)
  const rafRef = useRef(null)
  const scrollPosRef = useRef(0)
  const audioRef = useRef(null)
  const hideTimerRef = useRef(null)
  const ytPlayerRef = useRef(null)
  const playStartRef = useRef(null)
  const scrollStartedRef = useRef(false)
  const songRef = useRef(null)
  const { isMember } = useMembership()
  const [catalogReady, setCatalogReady] = useState(!!getCachedCatalog())

  // Keep songRef current so RAF loop always sees latest song data
  songRef.current = song

  // Warm the catalogue so isFreeThisWeek can compute on a cold deep-link
  useEffect(() => {
    if (!catalogReady) loadCatalog().then(() => setCatalogReady(true))
  }, [catalogReady])

  // Paywall: a locked song redirects to the Song page, where the Subscribe CTA lives
  const locked = LOCK_CONTENT && catalogReady && !!song && !canAccess(song, isMember)
  useEffect(() => {
    if (locked) nav(`/song/${id}`, { replace: true })
  }, [locked, id, nav])

  // Hidden YouTube instrumental is the primary backing source when present
  const ytId = getYouTubeId(song?.instrumental_url)
  const useYouTube = !!ytId && !ytFailed

  useEffect(() => {
    pushRecent(id)
    async function load() {
      const cached = findCachedSong(id)
      if (cached) { setSong(cached); if (cached.bpm) setBpm(cached.bpm); setLoading(false) }
      const { song } = await loadSong(id)
      if (song) { setSong(song); if (song.bpm) setBpm(song.bpm) }
      else if (!cached) setError('Song not found')
      setLoading(false)
    }
    load()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [id])

  // Hidden YouTube instrumental player — created when the song has a valid instrumental_url
  useEffect(() => {
    if (!ytId) { setYtReady(false); return }
    let player
    let cancelled = false
    loadYouTubeAPI().then((YT) => {
      if (cancelled) return
      player = new YT.Player('yt-player', {
        videoId: ytId,
        playerVars: { controls: 0, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { ytPlayerRef.current = player; setYtReady(true) },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) setIsPlaying(true)
            else if (e.data === YT.PlayerState.PAUSED) setIsPlaying(false)
            else if (e.data === YT.PlayerState.ENDED) setIsPlaying(false)
          },
          onError: () => { setYtFailed(true); setAudioError(!!song?.audio_url === false) },
        },
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      try { player && player.destroy() } catch { /* already gone */ }
      ytPlayerRef.current = null
      setYtReady(false)
    }
  }, [ytId])

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

  // Sync YouTube player with play/pause
  useEffect(() => {
    if (!useYouTube || !ytReady) return
    const p = ytPlayerRef.current
    if (!p) return
    try { isPlaying ? p.playVideo() : p.pauseVideo() } catch { /* not ready */ }
  }, [isPlaying, useYouTube, ytReady])

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      playStartRef.current = null
      return
    }
    if (!playStartRef.current) playStartRef.current = Date.now()
    const scrollSpeed = (bpm / 60) * lineHeight * 0.5 * multiplier

    let last = null
    function step(ts) {
      if (!last) last = ts
      const dt = (ts - last) / 1000
      last = ts

      const introSecs = songRef.current?.intro || 0
      const hasIntro = introSecs > 0

      // Time source: YouTube → MP3 → BPM clock
      let t = 0
      let haveAudioTime = false
      if (useYouTube) {
        const p = ytPlayerRef.current
        if (p && p.getCurrentTime) { try { t = p.getCurrentTime() || 0; haveAudioTime = true } catch { t = 0 } }
      } else {
        const audio = audioRef.current
        if (audio && !audio.paused) { t = audio.currentTime; haveAudioTime = true }
      }

      const lineTimings = songRef.current?.line_timings
      const hasLineTimings = lineTimings && Array.isArray(lineTimings) && lineTimings.length > 0

      // Tap-synced song with no audio: drive the timeline from wall-clock since Play
      if (hasLineTimings && !haveAudioTime) {
        t = (Date.now() - playStartRef.current) / 1000
      }

      // If song has line_timings, use the timeline to drive currentLine directly
      if (hasLineTimings && t > 0) {
        let activeLine = 0
        for (let li = 0; li < lineTimings.length; li++) {
          if (t >= lineTimings[li].start_time) activeLine = li
        }
        // Scroll to keep active line centered
        const targetScroll = activeLine * lineHeight
        scrollPosRef.current = targetScroll
        if (scrollRef.current) scrollRef.current.scrollTop = targetScroll
        setCurrentLine(activeLine)
      } else if (t > 0) {
        // Audio-backed: lock to audio time with intro offset
        scrollPosRef.current = Math.max(0, (t - introSecs) * scrollSpeed)
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollPosRef.current
          let line = Math.floor(scrollPosRef.current / lineHeight)
          while (line < lines.length && isHeaderLine(lines[line])) line++
          setCurrentLine(line)
        }
      } else if (hasIntro) {
        // BPM + intro set: use wall-clock elapsed to count down intro then scroll
        const elapsed = (Date.now() - playStartRef.current) / 1000
        scrollPosRef.current = Math.max(0, (elapsed - introSecs) * scrollSpeed)
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollPosRef.current
          let line = Math.floor(scrollPosRef.current / lineHeight)
          while (line < lines.length && isHeaderLine(lines[line])) line++
          setCurrentLine(line)
        }
      } else if (scrollStartedRef.current) {
        // BPM + no intro: accumulate dt only after user taps Start scroll
        scrollPosRef.current += scrollSpeed * dt
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollPosRef.current
          let line = Math.floor(scrollPosRef.current / lineHeight)
          while (line < lines.length && isHeaderLine(lines[line])) line++
          setCurrentLine(line)
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying, bpm, multiplier, useYouTube])

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

  function handleScrollStart() {
    scrollStartedRef.current = true
    setScrollStarted(true)
  }

  function handleRestart() {
    scrollPosRef.current = 0
    setCurrentLine(0)
    playStartRef.current = isPlaying ? Date.now() : null
    scrollStartedRef.current = false
    setScrollStarted(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    if (useYouTube && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(0); if (isPlaying) ytPlayerRef.current.playVideo() } catch { /* not ready */ }
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0
      if (isPlaying) audioRef.current.play().catch(() => {})
    }
  }

  // Nudge the song forward/back by a few seconds (the RAF loop re-derives the
  // scroll position from the time source, so the lyrics follow automatically).
  function handleSkip(seconds) {
    if (useYouTube && ytPlayerRef.current) {
      try {
        const t = Math.max(0, (ytPlayerRef.current.getCurrentTime() || 0) + seconds)
        ytPlayerRef.current.seekTo(t)
      } catch { /* not ready */ }
    } else if (audioRef.current && audioRef.current.src) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds)
    } else if (playStartRef.current) {
      // BPM-only mode: shifting the start time changes elapsed time
      scrollStartedRef.current = true
      setScrollStarted(true)
      playStartRef.current -= seconds * 1000
    }
  }

  if (loading || (LOCK_CONTENT && !catalogReady) || locked) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#070707', color: 'var(--text2)' }}>Loading…</div>
  if (error) return <div style={{ padding: 20, background: '#070707', color: 'var(--danger)', height: '100vh' }}>{error}</div>
  if (!song) return null

  const lines = (song.lyrics || '').split('\n').filter(Boolean)
  const isHeaderLine = (line) => /^(verse|chorus|bridge|outro|pre-?chorus|intro|hook|\[)/i.test(line.trim())
  const activeAudioUrl = song.audio_url
  const hasAudio = !!activeAudioUrl

  return (
    <div onClick={handleScreenTap} style={{ background: '#070707', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Hidden audio element — plays MP3 instrumental in sync with scroll (when no YouTube) */}
      {!useYouTube && hasAudio && (
        <audio key={activeAudioUrl} ref={audioRef} src={activeAudioUrl}
          onError={() => setAudioError(true)} preload="auto" />
      )}

      {/* Hidden YouTube instrumental player — off-screen, audio only */}
      {useYouTube && (
        <div style={{ position: 'absolute', top: -9999, left: -9999, width: 240, height: 135, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div id="yt-player" />
        </div>
      )}

      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '52px 20px 20px', background: 'linear-gradient(to bottom, rgba(7,7,7,0.9), transparent)', opacity: showControls ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: showControls ? 'auto' : 'none' }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <X size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="font-playfair" style={{ fontSize: 18, fontWeight: 600 }}>{song.title}</span>
          {(useYouTube || hasAudio) && !audioError && (() => {
            const c = 'var(--accent)'
            const label = useYouTube ? 'MUSIC' : 'AUDIO'
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
                  {label}
                </span>
              </span>
            )
          })()}
        </div>
        <button onClick={() => nav(`/tap-sync/${id}`)} title="Tap-sync timing" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center' }}>
          <Timer size={18} />
        </button>
      </div>

      {/* Lyrics scroll — karaoke style with word highlighting */}
      <div ref={scrollRef}
        style={{ position: 'absolute', inset: 0, overflowY: 'hidden', padding: '20px 20px 20px', textAlign: 'center' }}>
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

          // Get word-level timing if available
          const timingData = song?.line_timings?.[i]
          const hasWordTiming = timingData?.words && Array.isArray(timingData.words)

          if (hasWordTiming) {
            // Karaoke: highlight word by word using actual lyric words + estimated timing
            let currentTime = 0
            if (useYouTube && ytPlayerRef.current) {
              try { currentTime = ytPlayerRef.current.getCurrentTime() || 0 } catch { }
            } else if (audioRef.current && !audioRef.current.paused) {
              currentTime = audioRef.current.currentTime
            }

            // Use actual lyric words (not Whisper's phonetic guesses)
            const lyricWords = line.split(' ').filter(w => w.length > 0)
            const lineStart = timingData.start_time
            const lineEnd = timingData.end_time
            const lineDuration = lineEnd - lineStart

            return (
              <p key={i} className="font-playfair" style={{
                fontSize: isCurrent ? 24 : isNext ? 19 : 15,
                fontWeight: isCurrent ? 800 : 600,
                lineHeight: `${lineHeight}px`,
                marginBottom: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}>
                {lyricWords.map((word, wi) => {
                  // Estimate each word's time evenly within the line's duration
                  const wordStart = lineStart + (wi / lyricWords.length) * lineDuration
                  const wordEnd = lineStart + ((wi + 1) / lyricWords.length) * lineDuration
                  const isActive = currentTime >= wordStart && currentTime < wordEnd
                  const isPastWord = currentTime >= wordEnd
                  return (
                    <span key={wi} style={{
                      color: isActive ? 'var(--accent)' : isPastWord ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)',
                      textShadow: isActive ? '0 0 20px rgba(0,229,160,0.6)' : 'none',
                      transition: 'all 0.1s ease',
                      marginRight: '0.3em'
                    }}>
                      {word}
                    </span>
                  )
                })}
              </p>
            )
          }

          // Fallback: line-level highlighting
          return (
            <p key={i} className="font-playfair" style={{
              fontSize: isCurrent ? 32 : isNext ? 28 : 24,
              fontWeight: isCurrent ? 700 : 500,
              lineHeight: `${lineHeight}px`,
              color: isCurrent ? 'rgba(255,255,255,1)' : isNext ? 'rgba(255,255,255,0.55)' : isPast ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)',
              transition: 'all 0.3s ease',
              marginBottom: 0,
            }}>
              {line}
            </p>
          )
        })}
        <div style={{ height: 200 }} />
      </div>

      {/* Tap to start scroll — shown when playing, no intro/timings set, scroll not yet started */}
      {isPlaying && !(song?.intro > 0) && !(song?.line_timings?.length > 0) && !scrollStarted && (
        <div style={{ position: 'absolute', bottom: 180, left: 0, right: 0, zIndex: 30, display: 'flex', justifyContent: 'center' }}>
          <button onClick={e => { e.stopPropagation(); handleScrollStart() }}
            style={{ background: 'var(--accent)', border: 'none', borderRadius: 999, color: '#000', fontWeight: 800, fontSize: 15, padding: '14px 32px', cursor: 'pointer', boxShadow: '0 8px 28px rgba(0,229,160,0.5)', animation: 'pulse 1.2s ease-in-out infinite', letterSpacing: '0.04em' }}>
            ▶ TAP WHEN SINGING STARTS
          </button>
        </div>
      )}

      {/* Control dock */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, background: 'linear-gradient(to top, rgba(7,7,7,0.98) 70%, transparent)', padding: '30px 20px 36px', opacity: showControls ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: showControls ? 'auto' : 'none' }}>
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
          <button onClick={handleRestart} aria-label="Restart"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
            <SkipBack size={24} />
          </button>
          <button onClick={() => setIsPlaying(p => !p)}
            style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(0,229,160,0.4)' }}>
            {isPlaying ? <Pause size={26} color="#000" /> : <Play size={26} color="#000" fill="#000" />}
          </button>
          <button onClick={() => handleSkip(10)} aria-label="Skip forward 10 seconds"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
            <SkipForward size={24} />
          </button>
        </div>
      </div>
    </div>
  )
}
