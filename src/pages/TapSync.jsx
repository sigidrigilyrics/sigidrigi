import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Play, Pause, RotateCcw, Undo2, Check, Music } from 'lucide-react'
import { loadSong, findCachedSong } from '../lib/songs'
import { supabase, isConfigured } from '../lib/supabase'
import { getYouTubeId, loadYouTubeAPI } from '../lib/youtube'

const isHeaderLine = (line) => /^(verse|chorus|bridge|outro|pre-?chorus|intro|hook|\[)/i.test(line.trim())

// Tap-Sync: play the backing track (YouTube) or an external/live source, and
// tap once as each lyric line begins. We record the exact time per line and
// save it as line_timings — the same shape Sing Mode reads for karaoke scroll.
export default function TapSync() {
  const { id } = useParams()
  const nav = useNavigate()

  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [started, setStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [taps, setTaps] = useState({})       // { lineIndex: startTime }
  const [pointer, setPointer] = useState(0)   // index into `lines` of the next line to tap
  const [elapsed, setElapsed] = useState(0)   // live clock display

  // Quick sync: two timestamps (singing starts / song ends) instead of a tap per
  // line — enough for the exact-pace Sigidrigi scroll. Default mode.
  const [mode, setMode] = useState('quick')   // 'quick' | 'lines'
  const [quickStart, setQuickStart] = useState(null)
  const [quickEnd, setQuickEnd] = useState(null)
  const [savedNote, setSavedNote] = useState('')

  const ytPlayerRef = useRef(null)
  const [ytReady, setYtReady] = useState(false)
  const clockStartRef = useRef(null)
  const rafRef = useRef(null)

  const ytId = getYouTubeId(song?.instrumental_url)
  const useYouTube = !!ytId

  // Load the song
  useEffect(() => {
    async function load() {
      const cached = findCachedSong(id)
      if (cached) { setSong(cached); setLoading(false) }
      const { song: s } = await loadSong(id)
      if (s) setSong(s)
      else if (!cached) setError('Song not found')
      setLoading(false)
    }
    load()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [id])

  // Hidden YouTube player for the backing track
  useEffect(() => {
    if (!ytId) { setYtReady(false); return }
    let player, cancelled = false
    loadYouTubeAPI().then((YT) => {
      if (cancelled) return
      player = new YT.Player('tapsync-yt-player', {
        videoId: ytId,
        playerVars: { controls: 0, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { ytPlayerRef.current = player; setYtReady(true) },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) setIsPlaying(true)
            else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) setIsPlaying(false)
          },
        },
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      // Stop before destroy so no media session lingers (avoids Android PiP ghosts)
      try { player && player.stopVideo && player.stopVideo() } catch { /* not started */ }
      try { player && player.destroy() } catch { /* gone */ }
      ytPlayerRef.current = null
      setYtReady(false)
    }
  }, [ytId])

  // Current time source — YouTube currentTime, or wall-clock since Start
  function now() {
    if (useYouTube && ytPlayerRef.current?.getCurrentTime) {
      try { return ytPlayerRef.current.getCurrentTime() || 0 } catch { return 0 }
    }
    if (clockStartRef.current) return (Date.now() - clockStartRef.current) / 1000
    return 0
  }

  // Live clock display while running
  useEffect(() => {
    if (!isPlaying && !(started && !useYouTube)) return
    function tick() { setElapsed(now()); rafRef.current = requestAnimationFrame(tick) }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying, started, useYouTube])

  const lines = (song?.lyrics || '').split('\n').filter(Boolean)
  // Indices of the lines that are actually sung (skip Verse/Chorus headers)
  const sungIndices = lines.map((l, i) => isHeaderLine(l) ? -1 : i).filter(i => i >= 0)
  const tappedCount = Object.keys(taps).length
  const totalToTap = sungIndices.length
  const done = tappedCount >= totalToTap && totalToTap > 0

  function start(chosenMode) {
    if (chosenMode) setMode(chosenMode)
    setStarted(true)
    clockStartRef.current = Date.now()
    if (useYouTube && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(0); ytPlayerRef.current.playVideo() } catch { /* not ready */ }
    } else {
      setIsPlaying(true)
    }
  }

  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  function trackDuration() {
    if (!useYouTube || !ytPlayerRef.current?.getDuration) return 0
    try { return ytPlayerRef.current.getDuration() || 0 } catch { return 0 }
  }

  // Save the two quick timestamps. If the sing_end column hasn't been added to the
  // DB yet, degrade to saving the start only (still improves the song) with a note.
  async function saveQuick() {
    if (!isConfigured) { setError('Supabase not configured'); return }
    setSaving(true)
    setError('')
    const payload = { intro: Math.round(quickStart), sing_end: Math.round(quickEnd) }
    let { error: err } = await supabase.from('songs').update(payload).eq('id', id)
    if (err && /sing_end/i.test(err.message || '')) {
      ;({ error: err } = await supabase.from('songs').update({ intro: payload.intro }).eq('id', id))
      if (!err) setSavedNote('Start saved — the song-end column is missing in Supabase, so run the sing_end SQL once and re-sync to store the end too.')
    }
    if (err) { setError(`Save failed: ${err.message}`); setSaving(false); return }
    setSaved(true)
    setSaving(false)
  }

  function togglePlay() {
    if (useYouTube && ytPlayerRef.current) {
      try { isPlaying ? ytPlayerRef.current.pauseVideo() : ytPlayerRef.current.playVideo() } catch { /* */ }
    } else {
      // Wall-clock: pause = freeze by storing offset
      if (isPlaying) {
        clockStartRef.current = null
        setIsPlaying(false)
      } else {
        clockStartRef.current = Date.now() - elapsed * 1000
        setIsPlaying(true)
      }
    }
  }

  // Advance the pointer past any header lines, recording the same time for them
  function tap() {
    const t = now()
    // Find the next sung line at/after pointer
    let i = pointer
    while (i < lines.length && isHeaderLine(lines[i])) i++
    if (i >= lines.length) return
    setTaps(prev => {
      const next = { ...prev }
      // Any header lines we skipped over share this start time
      for (let h = pointer; h < i; h++) next[h] = t
      next[i] = t
      return next
    })
    setPointer(i + 1)
  }

  function undo() {
    if (pointer === 0) return
    // Step back to the previous sung line
    let i = pointer - 1
    while (i > 0 && isHeaderLine(lines[i])) i--
    setTaps(prev => {
      const next = { ...prev }
      for (let h = i; h < pointer; h++) delete next[h]
      return next
    })
    setPointer(i)
  }

  function restart() {
    setTaps({})
    setPointer(0)
    setElapsed(0)
    setQuickStart(null)
    setQuickEnd(null)
    clockStartRef.current = useYouTube ? null : null
    if (useYouTube && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(0); ytPlayerRef.current.pauseVideo() } catch { /* */ }
    }
    setIsPlaying(false)
    setStarted(false)
  }

  function buildTimings() {
    return lines.map((line, i) => {
      // Determine this line's start: its own tap, or nearest tapped line
      let start = taps[i]
      if (start == null) {
        // header or untapped — borrow the next tapped line's time, else previous
        for (let j = i + 1; j < lines.length && start == null; j++) start = taps[j]
        for (let j = i - 1; j >= 0 && start == null; j--) start = taps[j]
      }
      start = start ?? 0
      // End = next line's start, or +3s for the last
      let end = null
      for (let j = i + 1; j < lines.length; j++) { if (taps[j] != null) { end = taps[j]; break } }
      if (end == null || end <= start) end = start + 3
      const words = line.split(' ').filter(Boolean)
      const dur = end - start
      return {
        line,
        start_time: start,
        end_time: end,
        words: words.map((w, wi) => ({
          text: w,
          start_time: start + (wi / words.length) * dur,
          end_time: start + ((wi + 1) / words.length) * dur,
        })),
      }
    })
  }

  async function save() {
    if (!isConfigured) { setError('Supabase not configured'); return }
    setSaving(true)
    setError('')
    const timings = buildTimings()
    // intro = time of the first sung line, so non-synced fallback still works
    const firstSung = sungIndices.length ? taps[sungIndices[0]] : 0
    const { error: err } = await supabase.from('songs')
      .update({ line_timings: timings, intro: Math.round(firstSung || 0) })
      .eq('id', id)
    if (err) { setError(`Save failed: ${err.message}`); setSaving(false); return }
    setSaved(true)
    setSaving(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#070707', color: 'var(--text2)' }}>Loading…</div>
  if (error && !song) return <div style={{ padding: 20, background: '#070707', color: 'var(--danger)', height: '100vh' }}>{error}</div>
  if (!song) return null

  // Lines around the current tap target for the focus view
  let target = pointer
  while (target < lines.length && isHeaderLine(lines[target])) target++
  const prevLine = target > 0 ? lines[target - 1] : null
  const curLine = target < lines.length ? lines[target] : null
  const nextLine = target + 1 < lines.length ? lines[target + 1] : null

  return (
    <div style={{ background: '#070707', minHeight: '100vh', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      {/* Hidden YT player */}
      {useYouTube && (
        <div style={{ position: 'absolute', top: -9999, left: -9999, width: 240, height: 135, opacity: 0, pointerEvents: 'none' }}>
          <div id="tapsync-yt-player" />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '52px 20px 12px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="font-playfair" style={{ fontSize: 22, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h1>
          <p style={{ color: 'var(--text2)', fontSize: 12 }}>
            {useYouTube ? '🎵 Backing track loaded' : 'Play the song elsewhere & tap along'}
          </p>
        </div>
      </div>

      {saved ? (
        /* Success */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
          <Check size={56} color="var(--accent)" style={{ marginBottom: 14 }} />
          <h2 className="font-playfair" style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Timing saved!</h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: savedNote ? 10 : 28 }}>
            {mode === 'quick'
              ? `${song.title} now scrolls at exact pace — singing ${mmss(quickStart || 0)} to ${mmss(quickEnd || 0)}.`
              : `${song.title} now scrolls in sync — ${totalToTap} lines.`}
          </p>
          {savedNote && <p style={{ color: 'var(--gold)', fontSize: 12.5, lineHeight: 1.5, marginBottom: 24 }}>{savedNote}</p>}
          <button onClick={() => nav(`/sing/${id}`)} style={{ width: '100%', maxWidth: 320, background: 'var(--accent)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', cursor: 'pointer', marginBottom: 10 }}>
            Test in Sing Mode
          </button>
          <button onClick={() => nav(-1)} style={{ width: '100%', maxWidth: 320, background: 'var(--bg2)', border: 'none', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 14, padding: '12px', cursor: 'pointer' }}>
            Done
          </button>
        </div>
      ) : !started ? (
        /* Intro / start screen */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
          <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(0,229,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Music size={38} color="var(--accent)" />
          </div>
          <h2 className="font-playfair" style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Tap to sync</h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.5, marginBottom: 26 }}>
            {useYouTube
              ? 'The backing track will play. Quick sync needs just 1–2 taps; line-by-line gives full karaoke.'
              : 'Play the song elsewhere (or sing it). Quick sync needs just 2 taps; line-by-line gives full karaoke.'}
          </p>
          <button onClick={() => start('quick')} disabled={useYouTube && !ytReady}
            style={{ width: '100%', maxWidth: 320, background: (useYouTube && !ytReady) ? 'var(--bg3)' : 'var(--accent)', border: 'none', borderRadius: 14, color: (useYouTube && !ytReady) ? 'var(--text3)' : '#000', fontWeight: 800, fontSize: 16, padding: '16px', cursor: (useYouTube && !ytReady) ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Play size={18} fill="currentColor" /> {useYouTube ? (ytReady ? 'Quick sync' : 'Loading track…') : 'Quick sync'}</span>
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>Tap when singing starts — done</span>
          </button>
          <button onClick={() => start('lines')} disabled={useYouTube && !ytReady}
            style={{ width: '100%', maxWidth: 320, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, color: (useYouTube && !ytReady) ? 'var(--text3)' : 'var(--text)', fontWeight: 700, fontSize: 14, padding: '13px', cursor: (useYouTube && !ytReady) ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span>Line-by-line karaoke sync</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)' }}>{totalToTap} lines to tap</span>
          </button>
        </div>
      ) : mode === 'quick' ? (
        /* Quick sync session — two timestamps only */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 8px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>⚡ Quick sync</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>{elapsed.toFixed(1)}s</span>
          </div>

          {/* Captured timestamps */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 340 }}>
              {[['Singing starts', quickStart], ['Song ends', quickEnd]].map(([label, val]) => (
                <div key={label} style={{ flex: 1, background: val != null ? 'rgba(0,229,160,0.1)' : 'var(--bg2)', border: `1px solid ${val != null ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`, borderRadius: 14, padding: '14px 10px' }}>
                  <p className="font-playfair" style={{ fontSize: 26, fontWeight: 800, color: val != null ? 'var(--accent)' : 'var(--text3)', lineHeight: 1 }}>
                    {val != null ? mmss(val) : '—:—'}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginTop: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5 }}>
              {quickStart == null
                ? 'Listen for the first sung word, then hit the big button.'
                : quickEnd == null
                  ? (useYouTube ? 'Tap at the last sung word — or just use the track end.' : 'Tap when the song ends.')
                  : 'Looks good — save it.'}
            </p>
          </div>

          {/* Controls */}
          <div style={{ padding: '0 20px 36px' }}>
            {error && <p style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{error}</p>}

            {quickStart == null ? (
              <button onClick={() => setQuickStart(now())}
                style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 18, color: '#000', fontWeight: 900, fontSize: 20, padding: '28px', cursor: 'pointer', letterSpacing: '0.04em', marginBottom: 12, boxShadow: '0 8px 30px rgba(0,229,160,0.35)', userSelect: 'none' }}>
                TAP — SINGING STARTS
              </button>
            ) : quickEnd == null ? (
              <>
                <button onClick={() => setQuickEnd(Math.max(now(), quickStart + 4))}
                  style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 18, color: '#000', fontWeight: 900, fontSize: 20, padding: '28px', cursor: 'pointer', letterSpacing: '0.04em', marginBottom: 10, boxShadow: '0 8px 30px rgba(0,229,160,0.35)', userSelect: 'none' }}>
                  TAP — SONG ENDS
                </button>
                {useYouTube && trackDuration() > quickStart + 4 && (
                  <button onClick={() => setQuickEnd(trackDuration())}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 12, color: 'var(--accent)', fontWeight: 700, fontSize: 14, padding: '13px', cursor: 'pointer', marginBottom: 12 }}>
                    Ends with the track ({mmss(trackDuration())})
                  </button>
                )}
              </>
            ) : (
              <button onClick={saveQuick} disabled={saving}
                style={{ width: '100%', background: saving ? 'var(--bg3)' : 'var(--accent)', border: 'none', borderRadius: 18, color: saving ? 'var(--text3)' : '#000', fontWeight: 800, fontSize: 17, padding: '20px', cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Check size={18} /> {saving ? 'Saving…' : `Save — singing ${mmss(quickStart)} to ${mmss(quickEnd)}`}
              </button>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={togglePlay} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />} {isPlaying ? 'Pause' : 'Resume'}
              </button>
              <button onClick={() => { quickEnd != null ? setQuickEnd(null) : setQuickStart(null) }} disabled={quickStart == null}
                style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 12, color: quickStart == null ? 'var(--text3)' : 'var(--text)', fontWeight: 600, fontSize: 13, padding: '12px', cursor: quickStart == null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Undo2 size={16} /> Undo
              </button>
              <button onClick={restart} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <RotateCcw size={16} /> Restart
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tap session */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Progress + clock */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 8px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{tappedCount} / {totalToTap}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>{elapsed.toFixed(1)}s</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg2)', margin: '0 20px 16px', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totalToTap ? (tappedCount / totalToTap) * 100 : 0}%`, background: 'var(--accent)', transition: 'width 0.2s' }} />
          </div>

          {/* Focus view: previous / current / next line */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center', gap: 14 }}>
            {prevLine && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.25)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prevLine}</p>}
            {curLine ? (
              <p className="font-playfair" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.25 }}>{curLine}</p>
            ) : (
              <p className="font-playfair" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>✓ All lines tapped</p>
            )}
            {nextLine && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextLine}</p>}
          </div>

          {/* Controls */}
          <div style={{ padding: '0 20px 36px' }}>
            {error && <p style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{error}</p>}

            {/* The big TAP button */}
            <button onClick={tap} disabled={done}
              style={{ width: '100%', background: done ? 'var(--bg3)' : 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 18, color: done ? 'var(--text3)' : '#000', fontWeight: 900, fontSize: 22, padding: '28px', cursor: done ? 'default' : 'pointer', letterSpacing: '0.05em', marginBottom: 12, boxShadow: done ? 'none' : '0 8px 30px rgba(0,229,160,0.35)', userSelect: 'none' }}>
              {done ? 'DONE — SAVE BELOW' : 'TAP'}
            </button>

            {/* Secondary controls */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <button onClick={togglePlay} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />} {isPlaying ? 'Pause' : 'Resume'}
              </button>
              <button onClick={undo} disabled={tappedCount === 0} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 12, color: tappedCount === 0 ? 'var(--text3)' : 'var(--text)', fontWeight: 600, fontSize: 13, padding: '12px', cursor: tappedCount === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Undo2 size={16} /> Undo
              </button>
              <button onClick={restart} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <RotateCcw size={16} /> Restart
              </button>
            </div>

            {/* Save */}
            <button onClick={save} disabled={!done || saving}
              style={{ width: '100%', background: (!done || saving) ? 'var(--bg3)' : 'var(--accent)', border: 'none', borderRadius: 12, color: (!done || saving) ? 'var(--text3)' : '#000', fontWeight: 700, fontSize: 15, padding: '14px', cursor: (!done || saving) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Check size={16} /> {saving ? 'Saving…' : done ? 'Save timing' : `Tap all ${totalToTap} lines first`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
