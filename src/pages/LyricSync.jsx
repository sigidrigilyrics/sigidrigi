import { useState } from 'react'
import { ChevronLeft, Check, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase, isConfigured } from '../lib/supabase'

export default function LyricSync() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [introSeconds, setIntroSeconds] = useState(0)
  const [jsonInput, setJsonInput] = useState('')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  function parseJSON() {
    try {
      setError('')
      const data = JSON.parse(jsonInput)
      if (!data.lyric_timing || !Array.isArray(data.lyric_timing)) {
        throw new Error('Invalid format: need lyric_timing array')
      }
      setParsed(data)
      setStep(4)
    } catch (e) {
      setError(`Parse error: ${e.message}`)
    }
  }

  async function saveSong() {
    if (!parsed || !songTitle.trim() || !lyrics.trim()) {
      setError('Missing: title, lyrics, or timing data')
      return
    }
    if (!isConfigured) {
      setError('Supabase not configured')
      return
    }

    setSaving(true)
    setError('')

    try {
      const newSong = {
        title: songTitle.trim(),
        lyrics: lyrics.trim(),
        bpm: 120,
        intro: parseInt(introSeconds) || 0,
        instrumental_url: youtubeUrl.trim() || null,
        line_timings: parsed.lyric_timing,
        category: 'Traditional',
        verified: false,
        composer: 'Traditional'
      }

      const { data, error: err } = await supabase
        .from('songs')
        .insert([newSong])
        .select()

      if (err) throw err
      setSavedId(data?.[0]?.id)
      setStep(5)
    } catch (e) {
      setError(`Save failed: ${e.message}`)
    }
    setSaving(false)
  }

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '52px 20px 20px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-playfair" style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Lyric Sync</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Add songs with timing</p>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {/* Step 1: Instructions */}
        {step === 1 && (
          <>
            <div style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>How it works</h2>
              <ol style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20, color: 'var(--text2)' }}>
                <li style={{ marginBottom: 8 }}>Run Python script: <code style={{ background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>python scripts/sync_lyrics.py</code></li>
                <li style={{ marginBottom: 8 }}>Enter YouTube URL, song title, intro time, lyrics</li>
                <li style={{ marginBottom: 8 }}>Whisper transcribes audio → matches timing</li>
                <li>Get <code style={{ background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>lyric_timing.json</code></li>
              </ol>
            </div>
            <button onClick={() => setStep(2)} style={{
              width: '100%',
              background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))',
              border: 'none',
              borderRadius: 12,
              color: '#000',
              fontWeight: 700,
              fontSize: 15,
              padding: '15px',
              cursor: 'pointer'
            }}>
              I have lyric_timing.json
            </button>
          </>
        )}

        {/* Step 2: Song metadata */}
        {step === 2 && (
          <>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Song title *</label>
            <input value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="e.g. Vaka Na Vula Cabe Mai"
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '10px 12px', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>YouTube instrumental URL</label>
            <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtu.be/..."
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '10px 12px', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Intro (seconds)</label>
            <input type="number" value={introSeconds} onChange={e => setIntroSeconds(e.target.value)} placeholder="e.g. 24"
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '10px 12px', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Lyrics *</label>
            <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} placeholder="VERSE 1&#10;LINE 1&#10;LINE 2..."
              style={{ width: '100%', height: 120, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '10px 12px', outline: 'none', marginBottom: 14, boxSizing: 'border-box', fontFamily: 'monospace' }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>Back</button>
              <button onClick={() => setStep(3)} disabled={!songTitle.trim() || !lyrics.trim()} style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, padding: '12px', cursor: 'pointer', opacity: (songTitle.trim() && lyrics.trim()) ? 1 : 0.5 }}>Next</button>
            </div>
          </>
        )}

        {/* Step 3: Paste JSON */}
        {step === 3 && (
          <>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase' }}>Paste lyric_timing.json *</label>
            <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder='{"lyric_timing":[...]}'
              style={{ width: '100%', height: 200, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12, padding: '10px 12px', outline: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'monospace' }} />

            {error && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 10, padding: 12, marginBottom: 12, color: 'var(--danger)', fontSize: 13, display: 'flex', gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>Back</button>
              <button onClick={parseJSON} disabled={!jsonInput.trim()} style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, padding: '12px', cursor: 'pointer', opacity: jsonInput.trim() ? 1 : 0.5 }}>Parse</button>
            </div>
          </>
        )}

        {/* Step 4: Review */}
        {step === 4 && parsed && (
          <>
            <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Song</p>
              <p className="font-playfair" style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>{songTitle}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Intro</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{introSeconds}s</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Lines</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{parsed.lyric_timing.length}</p>
                </div>
              </div>

              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase' }}>Preview</p>
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, maxHeight: 150, overflowY: 'auto' }}>
                {parsed.lyric_timing.slice(0, 10).map((line, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{line.start_time.toFixed(2)}s</span> — {line.line}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 10, padding: 12, marginBottom: 12, color: 'var(--danger)', fontSize: 13, display: 'flex', gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>Back</button>
              <button onClick={saveSong} disabled={saving} style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.6 : 1 }}>
                <Check size={16} />
                {saving ? 'Saving...' : 'Save Song'}
              </button>
            </div>
          </>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <>
            <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid var(--accent)', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20 }}>
              <Check size={48} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
              <p className="font-playfair" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Song added!</p>
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>
                {songTitle} is now in the catalogue with {parsed.lyric_timing.length} timed lines.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => nav('/admin')} style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, padding: '12px', cursor: 'pointer' }}>Back to Admin</button>
              <button onClick={() => {
                setStep(1)
                setSongTitle('')
                setSongTitle('')
                setLyrics('')
                setIntroSeconds(0)
                setJsonInput('')
                setParsed(null)
              }} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>Add another</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
