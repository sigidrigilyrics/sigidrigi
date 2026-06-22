import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Upload as UploadIcon, RefreshCw, Save } from 'lucide-react'
import Tesseract from 'tesseract.js'
import { supabase } from '../lib/supabase'
import BottomTabBar from '../components/BottomTabBar'

const CORRECTIONS = [
  { from: /ngg/g, to: 'q', label: 'ngg → q' },
  { from: /th/g, to: 'c', label: 'th → c' },
  { from: /mb/g, to: 'b', label: 'mb → b' },
  { from: /nd/g, to: 'd', label: 'nd → d' },
  { from: /ng\b/g, to: 'g', label: 'ng(end) → g' },
]

function applyCorrections(text) {
  let out = text
  CORRECTIONS.forEach(c => { out = out.replace(c.from, c.to) })
  return out
}

export default function Upload() {
  const nav = useNavigate()
  const fileRef = useRef(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrState, setOcrState] = useState('idle') // idle | scanning | done | error
  const [title, setTitle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  async function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    setImageUrl(URL.createObjectURL(file))
    setOcrState('scanning')
    setOcrProgress(0)
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)) }
      })
      const corrected = applyCorrections(result.data.text)
      setLyrics(corrected)
      setOcrState('done')
    } catch (err) {
      setOcrState('error')
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('songs').insert({ title, lyrics, free: false, verified: false })
    if (error) { setSaveError(error.message); setSaving(false); return }
    setSaved(true)
    setSaving(false)
  }

  const inputStyle = { width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 15, padding: '13px 14px', outline: 'none', fontFamily: 'Inter, sans-serif' }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '52px 20px 6px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-playfair" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>Add a song</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Photograph a songbook page</p>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Photo / drop zone */}
        {!imageUrl ? (
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', background: 'var(--bg1)', border: '2px dashed var(--border)', borderRadius: 18, padding: '40px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <UploadIcon size={32} color="var(--text3)" />
            <p style={{ color: 'var(--text2)', fontWeight: 600 }}>Tap to photograph or upload</p>
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>JPG, PNG, HEIC supported</p>
          </button>
        ) : (
          <div style={{ background: 'var(--bg1)', borderRadius: 18, overflow: 'hidden', marginBottom: 20, position: 'relative' }}>
            <img src={imageUrl} alt="Captured page" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
            {fileName && (
              <span style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', color: 'var(--text)', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>
                {fileName}
              </span>
            )}
            {ocrState === 'scanning' && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}>
                <div className="scan-line" style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
              </div>
            )}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])} />

        {/* Progress */}
        {ocrState === 'scanning' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: 'var(--bg1)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ width: 16, height: 16, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--text2)', flex: 1 }}>Reading text…</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{ocrProgress}%</p>
          </div>
        )}

        {ocrState === 'error' && (
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: 14, marginBottom: 16, color: 'var(--danger)', fontSize: 14 }}>
            OCR failed. Please try a clearer image.
          </div>
        )}

        {/* Correction chips */}
        {ocrState === 'done' && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Fijian corrections applied</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CORRECTIONS.map(c => (
                <span key={c.label} style={{ background: 'var(--bg2)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999 }}>{c.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Fields */}
        {(ocrState === 'done' || ocrState === 'idle') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Title</p>
              <input style={inputStyle} placeholder="Song title" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            {ocrState === 'done' && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Transcribed lyrics</p>
                <textarea style={{ ...inputStyle, border: '1px solid var(--accent)', minHeight: 180, resize: 'vertical', lineHeight: 1.6 }}
                  value={lyrics} onChange={e => setLyrics(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {saveError && <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: 12, marginBottom: 14, color: 'var(--danger)', fontSize: 13 }}>{saveError}</div>}
        {saved && <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid var(--accent)', borderRadius: 12, padding: 12, marginBottom: 14, color: 'var(--accent)', fontSize: 13 }}>Song saved! Admin will verify it shortly.</div>}

        {(ocrState === 'done' || ocrState === 'idle') && !saved && (
          <div style={{ display: 'flex', gap: 10 }}>
            {imageUrl && (
              <button onClick={() => { setImageUrl(null); setOcrState('idle'); setLyrics('') }}
                style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 14, padding: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <RefreshCw size={15} /> Re-scan
              </button>
            )}
            <button onClick={handleSave} disabled={saving || !title}
              style={{ flex: 2, background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 15, padding: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Save size={15} /> {saving ? 'Saving…' : 'Save song'}
            </button>
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  )
}
