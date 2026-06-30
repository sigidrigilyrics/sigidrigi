import { useState } from 'react'
import { ChevronLeft, Upload, Check, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LyricSync() {
  const nav = useNavigate()
  const [step, setStep] = useState(1) // 1: instructions, 2: paste JSON, 3: review, 4: save
  const [jsonInput, setJsonInput] = useState('')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function parseJSON() {
    try {
      setError('')
      const data = JSON.parse(jsonInput)
      if (!data.song_title || !data.lyric_timing || !Array.isArray(data.lyric_timing)) {
        throw new Error('Invalid format: need song_title and lyric_timing array')
      }
      setParsed(data)
      setStep(3)
    } catch (e) {
      setError(`Parse error: ${e.message}`)
    }
  }

  async function saveTiming() {
    if (!parsed) return
    setSaving(true)

    // For now: just show it was parsed
    // Next: integrate with database to update song with line_timings
    alert(`✅ Timing data ready!\n\nSong: ${parsed.song_title}\nLines: ${parsed.lyric_timing.length}\n\nNext: Add this song in Admin → Songs, then we'll link the timing.`)
    setSaving(false)
    setStep(1)
    setJsonInput('')
    setParsed(null)
  }

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '52px 20px 20px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-playfair" style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Lyric Sync Tool</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Add line-by-line timing to songs</p>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {/* Step 1: Instructions */}
        {step === 1 && (
          <>
            <div style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>How it works</h2>
              <ol style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20, color: 'var(--text2)' }}>
                <li style={{ marginBottom: 8 }}>Run: <code style={{ background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4 }}>python scripts/sync_lyrics.py</code></li>
                <li style={{ marginBottom: 8 }}>Enter YouTube URL, song title, intro time, and lyrics</li>
                <li style={{ marginBottom: 8 }}>Script downloads audio and transcribes with Whisper</li>
                <li style={{ marginBottom: 8 }}>Get <code style={{ background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4 }}>lyric_timing.json</code> output</li>
                <li>Paste the JSON here</li>
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
              cursor: 'pointer',
              boxShadow: '0 8px 22px rgba(0,229,160,0.3)'
            }}>
              I have lyric_timing.json
            </button>
          </>
        )}

        {/* Step 2: Paste JSON */}
        {step === 2 && (
          <>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase' }}>
              Paste lyric_timing.json
            </label>
            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder='{"song_title":"...","intro_seconds":24,"lyric_timing":[...]}'
              style={{
                width: '100%',
                height: 200,
                background: 'var(--bg2)',
                border: '1px solid var(--bg3)',
                borderRadius: 10,
                color: 'var(--text)',
                fontFamily: 'monospace',
                fontSize: 12,
                padding: '12px',
                boxSizing: 'border-box',
                marginBottom: 12
              }}
            />

            {error && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 10, padding: 12, marginBottom: 12, color: 'var(--danger)', fontSize: 13, display: 'flex', gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1,
                background: 'var(--bg2)',
                border: 'none',
                borderRadius: 10,
                color: 'var(--text)',
                fontWeight: 600,
                padding: '12px',
                cursor: 'pointer'
              }}>
                Back
              </button>
              <button onClick={parseJSON} disabled={!jsonInput.trim()} style={{
                flex: 1,
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 10,
                color: '#000',
                fontWeight: 700,
                padding: '12px',
                cursor: jsonInput.trim() ? 'pointer' : 'not-allowed',
                opacity: jsonInput.trim() ? 1 : 0.5
              }}>
                Parse
              </button>
            </div>
          </>
        )}

        {/* Step 3: Review */}
        {step === 3 && parsed && (
          <>
            <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Song</p>
              <p className="font-playfair" style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{parsed.song_title}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Intro</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{parsed.intro_seconds || 0}s</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Lines</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{parsed.lyric_timing.length}</p>
                </div>
              </div>

              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Preview</p>
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, maxHeight: 150, overflowY: 'auto' }}>
                {parsed.lyric_timing.slice(0, 8).map((line, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{line.start_time.toFixed(2)}s</span> — {line.line}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{
                flex: 1,
                background: 'var(--bg2)',
                border: 'none',
                borderRadius: 10,
                color: 'var(--text)',
                fontWeight: 600,
                padding: '12px',
                cursor: 'pointer'
              }}>
                Back
              </button>
              <button onClick={saveTiming} disabled={saving} style={{
                flex: 1,
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 10,
                color: '#000',
                fontWeight: 700,
                padding: '12px',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: saving ? 0.6 : 1
              }}>
                <Check size={16} />
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
