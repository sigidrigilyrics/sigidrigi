import { useState, useRef } from 'react'
import { ChevronLeft, Check, AlertCircle, Camera, Music, Loader, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase, isConfigured } from '../lib/supabase'

const PROGRESS_MESSAGES = [
  'Downloading audio from YouTube…',
  'Sending to Whisper AI…',
  'Transcribing audio…',
  'Matching lyrics to timing…',
  'Almost done…',
]

export default function LyricSync() {
  const nav = useNavigate()
  const fileRef = useRef(null)
  const audioRef = useRef(null)
  const [audioFile, setAudioFile] = useState(null)

  // Read prefill from Upload page if available
  const prefill = (() => { try { return JSON.parse(localStorage.getItem('lyricSync_prefill') || '{}') } catch { return {} } })()
  if (prefill.lyrics) { localStorage.removeItem('lyricSync_prefill') }

  const [step, setStep] = useState(prefill.lyrics ? 2 : 1)
  const [songTitle, setSongTitle] = useState(prefill.title || '')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [introSeconds, setIntroSeconds] = useState(0)
  const [lyrics, setLyrics] = useState(prefill.lyrics || '')
  const [timing, setTiming] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')

  // Timing generation state
  const [generating, setGenerating] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')

  // Compress image and convert to base64
  async function compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 1600
        let w = img.width, h = img.height
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
      }
      img.src = url
    })
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrLoading(true)
    setOcrError('')
    try {
      const imageBase64 = await compressImage(file)
      const res = await fetch('/api/transcribe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'OCR failed')
      setLyrics(prev => prev ? prev + '\n' + data.lyrics : data.lyrics)
    } catch (e) {
      setOcrError(e.message)
    }
    setOcrLoading(false)
    e.target.value = ''
  }

  async function generateTiming() {
    if (!lyrics.trim()) { setError('Need lyrics first'); return }
    if (!youtubeUrl.trim() && !audioFile) { setError('Add a YouTube URL or upload an audio file'); return }
    setGenerating(true)
    setError('')

    // Cycle through progress messages
    let msgIdx = 0
    setProgressMsg(PROGRESS_MESSAGES[0])
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % PROGRESS_MESSAGES.length
      setProgressMsg(PROGRESS_MESSAGES[msgIdx])
    }, 8000)

    try {
      let body
      if (audioFile) {
        // Convert audio file to base64 and send directly — bypasses YouTube bot detection
        const ab = await audioFile.arrayBuffer()
        const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(ab)))
        body = { audioBase64, audioMimeType: audioFile.type, lyrics: lyrics.trim() }
      } else {
        body = { youtubeUrl: youtubeUrl.trim(), lyrics: lyrics.trim(), introSeconds: parseFloat(introSeconds) || 0 }
      }

      const res = await fetch('/api/sync-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate timing')
      setTiming(data.timing)
      setStep(4)
    } catch (e) {
      setError(e.message)
    }
    clearInterval(interval)
    setGenerating(false)
  }

  async function saveSong() {
    if (!timing || !songTitle.trim() || !lyrics.trim()) {
      setError('Missing title, lyrics, or timing')
      return
    }
    if (!isConfigured) { setError('Supabase not configured'); return }
    setSaving(true)
    setError('')
    try {
      const { data, error: err } = await supabase.from('songs').insert([{
        title: songTitle.trim(),
        lyrics: lyrics.trim(),
        bpm: 120,
        intro: parseInt(introSeconds) || 0,
        instrumental_url: youtubeUrl.trim() || null,
        line_timings: timing,
        category: 'Contemporary',
        verified: false,
        composer: 'Unknown'
      }]).select()
      if (err) throw err
      setSavedId(data?.[0]?.id)
      setStep(5)
    } catch (e) {
      setError(`Save failed: ${e.message}`)
    }
    setSaving(false)
  }

  function reset() {
    setStep(1); setSongTitle(''); setYoutubeUrl(''); setIntroSeconds(0)
    setLyrics(''); setTiming(null); setError(''); setSavedId(null)
  }

  const btn = (label, onClick, disabled, full = true) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? '100%' : 'auto',
      background: disabled ? 'var(--bg3)' : 'linear-gradient(135deg,var(--accent),var(--accent-dark))',
      border: 'none', borderRadius: 12, color: disabled ? 'var(--text3)' : '#000',
      fontWeight: 700, fontSize: 15, padding: '14px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
    }}>{label}</button>
  )

  const field = (label, value, onChange, opts = {}) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      {opts.textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={opts.placeholder}
            style={{ width: '100%', height: opts.height || 160, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '10px 12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', resize: 'vertical' }} />
        : <input type={opts.type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={opts.placeholder}
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }} />
      }
    </div>
  )

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '52px 20px 16px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-playfair" style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>Lyric Sync</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            {step === 1 && 'Song details'}
            {step === 2 && 'Add lyrics'}
            {step === 3 && 'Generate timing'}
            {step === 4 && 'Review timing'}
            {step === 5 && 'Saved!'}
          </p>
        </div>
      </div>

      {/* Step dots */}
      {step < 5 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 20px 20px', justifyContent: 'center' }}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{ width: s === step ? 24 : 8, height: 8, borderRadius: 4, background: s === step ? 'var(--accent)' : s < step ? 'rgba(0,229,160,0.4)' : 'var(--bg3)', transition: 'all 0.3s' }} />
          ))}
        </div>
      )}

      <div style={{ padding: '0 20px 20px' }}>

        {/* Step 1: Song Details */}
        {step === 1 && (
          <>
            {field('Song Title *', songTitle, setSongTitle, { placeholder: 'e.g. Noqu Daulomani' })}
            {field('YouTube Instrumental URL *', youtubeUrl, setYoutubeUrl, { placeholder: 'https://youtu.be/...' })}
            {field('Intro (seconds before singing starts)', introSeconds, setIntroSeconds, { type: 'number', placeholder: 'e.g. 31' })}
            {btn('Next → Add Lyrics', () => setStep(2), !songTitle.trim() || !youtubeUrl.trim())}
          </>
        )}

        {/* Step 2: Lyrics */}
        {step === 2 && (
          <>
            {/* OCR Photo Button */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} disabled={ocrLoading}
              style={{ width: '100%', background: 'var(--bg2)', border: '2px dashed var(--border)', borderRadius: 12, color: ocrLoading ? 'var(--text3)' : 'var(--accent)', fontWeight: 700, fontSize: 14, padding: '14px', cursor: ocrLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
              {ocrLoading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Scanning photo…</> : <><Camera size={18} /> Scan from Photo</>}
            </button>

            {ocrError && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 10, padding: 10, marginBottom: 12, color: 'var(--danger)', fontSize: 12 }}>
                {ocrError}
              </div>
            )}

            {field('Lyrics *', lyrics, setLyrics, { textarea: true, height: 280, placeholder: 'Paste or scan lyrics here\nOne line per line\nNo section headers' })}

            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16, textAlign: 'center' }}>
              {lyrics.trim().split('\n').filter(l => l.trim()).length} lines
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>Back</button>
              <button onClick={() => setStep(3)} disabled={!lyrics.trim()} style={{ flex: 2, background: !lyrics.trim() ? 'var(--bg3)' : 'var(--accent)', border: 'none', borderRadius: 10, color: !lyrics.trim() ? 'var(--text3)' : '#000', fontWeight: 700, padding: '12px', cursor: !lyrics.trim() ? 'not-allowed' : 'pointer' }}>
                Next → Generate Timing
              </button>
            </div>
          </>
        )}

        {/* Step 3: Generate Timing */}
        {step === 3 && (
          <>
            {/* Summary */}
            <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <p className="font-playfair" style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{songTitle}</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{youtubeUrl}</p>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                Intro: {introSeconds}s · {lyrics.trim().split('\n').filter(l => l.trim()).length} lyric lines
              </p>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 10, padding: 12, marginBottom: 16, color: 'var(--danger)', fontSize: 13, display: 'flex', gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                {error}
              </div>
            )}

            {generating ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ width: 48, height: 48, border: '3px solid var(--bg3)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{progressMsg}</p>
                <p style={{ color: 'var(--text3)', fontSize: 12 }}>This takes ~30–60 seconds…</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={generateTiming} style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 16, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Music size={20} /> {audioFile ? `Generate from: ${audioFile.name}` : 'Generate Timing with Whisper AI'}
                </button>

                {/* Audio file upload — bypasses YouTube bot detection */}
                <input ref={audioRef} type="file" accept="audio/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setAudioFile(f); e.target.value = '' }} />
                <button onClick={() => audioRef.current?.click()}
                  style={{ background: audioFile ? 'rgba(0,229,160,0.08)' : 'var(--bg2)', border: `1px dashed ${audioFile ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, color: audioFile ? 'var(--accent)' : 'var(--text2)', fontWeight: 600, fontSize: 13, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Upload size={15} />
                  {audioFile ? `✓ ${audioFile.name}` : 'Upload MP3 instead (if YouTube fails)'}
                </button>
                {audioFile && (
                  <button onClick={() => setAudioFile(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    ✕ Remove file, use YouTube URL
                  </button>
                )}

                <button onClick={() => setStep(2)} style={{ background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>
                  Back
                </button>
              </div>
            )}
          </>
        )}

        {/* Step 4: Review */}
        {step === 4 && timing && (
          <>
            <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Timing preview</p>
              <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text3)' }}>LINES</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{timing.length}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text3)' }}>DURATION</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                    {timing.length > 0 ? `${timing[timing.length-1].end_time.toFixed(0)}s` : '–'}
                  </p>
                </div>
              </div>
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, maxHeight: 200, overflowY: 'auto' }}>
                {timing.slice(0, 12).map((line, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 48, display: 'inline-block' }}>{line.start_time.toFixed(1)}s</span>
                    {line.line}
                  </div>
                ))}
                {timing.length > 12 && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>…and {timing.length - 12} more lines</p>}
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 10, padding: 12, marginBottom: 12, color: 'var(--danger)', fontSize: 13, display: 'flex', gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>Redo</button>
              <button onClick={saveSong} disabled={saving} style={{ flex: 2, background: saving ? 'var(--bg3)' : 'var(--accent)', border: 'none', borderRadius: 10, color: saving ? 'var(--text3)' : '#000', fontWeight: 700, padding: '12px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Check size={16} /> {saving ? 'Saving…' : 'Save Song'}
              </button>
            </div>
          </>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <>
            <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid var(--accent)', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20 }}>
              <Check size={52} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
              <p className="font-playfair" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Song saved!</p>
              <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                <strong>{songTitle}</strong> — {timing?.length} lines with karaoke timing
              </p>
            </div>
            {savedId && (
              <button onClick={() => nav(`/sing/${savedId}`)} style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', cursor: 'pointer', marginBottom: 10 }}>
                Test in Sing Mode
              </button>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => nav('/admin')} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>Admin</button>
              <button onClick={reset} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>Add Another</button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
