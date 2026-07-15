import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Camera, Check, Music, Loader, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { apiUrl } from '../lib/api'

const BUCKET = 'instrumentals'

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

export default function Upload() {
  const nav = useNavigate()
  const fileRef = useRef(null)
  const [pages, setPages] = useState([])
  const [uploading, setUploading] = useState(false)

  function updatePage(idx, patch) {
    setPages(p => p.map((pg, i) => i === idx ? { ...pg, ...patch } : pg))
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setUploading(true)

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx]
      const pageIdx = pages.length + idx
      setPages(p => [...p, { name: file.name, preview: URL.createObjectURL(file), uploading: true, transcribing: false, lyrics: '', title: '', saved: false, error: null }])

      try {
        // Upload to storage
        const path = `pages/${Date.now()}-${idx}-${file.name.replace(/\s+/g, '-')}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        updatePage(pageIdx, { uploading: false, transcribing: true })

        // Auto-transcribe with OCR
        const imageBase64 = await compressImage(file)
        const res = await fetch(apiUrl('/api/transcribe-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Transcription failed')

        updatePage(pageIdx, { transcribing: false, lyrics: data.lyrics, title: '' })
      } catch (e) {
        updatePage(pageIdx, { uploading: false, transcribing: false, error: e.message })
      }
    }
    setUploading(false)
    fileRef.current && (fileRef.current.value = '')
  }

  async function saveSong(idx) {
    const pg = pages[idx]
    if (!pg.title.trim() || !pg.lyrics.trim()) return
    updatePage(idx, { saving: true })
    try {
      const { error } = await supabase.from('songs').insert([{
        title: pg.title.trim(),
        lyrics: pg.lyrics.trim(),
        category: 'Traditional',
        verified: false,
        composer: 'Unknown',
        bpm: 80
      }])
      if (error) throw error
      updatePage(idx, { saved: true, saving: false })
    } catch (e) {
      updatePage(idx, { saving: false, error: e.message })
    }
  }

  function goToSync(idx) {
    const pg = pages[idx]
    localStorage.setItem('lyricSync_prefill', JSON.stringify({ lyrics: pg.lyrics, title: pg.title }))
    nav('/lyric-sync')
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '52px 20px 16px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-playfair" style={{ fontSize: 26, fontWeight: 800 }}>Digitize songbook</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Photos auto-transcribe instantly</p>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ width: '100%', background: 'rgba(0,229,160,0.06)', border: '2px dashed rgba(0,229,160,0.35)', borderRadius: 18, padding: '28px 20px', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Camera size={30} color="var(--accent)" />
          <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>
            {uploading ? 'Processing…' : 'Take photo or pick from gallery'}
          </p>
          <p style={{ color: 'var(--text3)', fontSize: 12 }}>Lyrics appear automatically</p>
        </button>

        <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
          style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18, alignItems: 'start' }}>
        {pages.map((pg, i) => (
          <div key={i} style={{ background: 'var(--bg2)', borderRadius: 16, overflow: 'hidden' }}>
            {/* Photo preview */}
            <div style={{ position: 'relative', height: 160 }}>
              <img src={pg.preview} alt={`Page ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.8))' }} />
              <p style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                Page {i + 1}
              </p>
            </div>

            <div style={{ padding: 14 }}>
              {/* Status */}
              {pg.uploading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: 13, marginBottom: 10 }}>
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…
                </div>
              )}
              {pg.transcribing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, marginBottom: 10 }}>
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Reading lyrics with AI…
                </div>
              )}
              {pg.error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>
                  <AlertCircle size={14} /> {pg.error}
                </div>
              )}

              {/* Transcribed lyrics */}
              {pg.lyrics && !pg.saved && (
                <>
                  <input
                    value={pg.title}
                    onChange={e => updatePage(i, { title: e.target.value })}
                    placeholder="Song title *"
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, padding: '8px 10px', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                  />
                  <textarea
                    value={pg.lyrics}
                    onChange={e => updatePage(i, { lyrics: e.target.value })}
                    style={{ width: '100%', height: 120, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'monospace', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveSong(i)} disabled={!pg.title.trim() || pg.saving}
                      style={{ flex: 1, background: (!pg.title.trim() || pg.saving) ? 'var(--bg3)' : 'var(--accent)', border: 'none', borderRadius: 8, color: (!pg.title.trim() || pg.saving) ? 'var(--text3)' : '#000', fontWeight: 700, fontSize: 13, padding: '10px', cursor: !pg.title.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Check size={14} /> {pg.saving ? 'Saving…' : 'Save Song'}
                    </button>
                    <button onClick={() => goToSync(i)} disabled={!pg.title.trim()}
                      style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 8, color: 'var(--accent)', fontWeight: 700, fontSize: 13, padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Music size={14} /> Add Timing
                    </button>
                  </div>
                </>
              )}

              {pg.saved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>
                  <Check size={16} /> Saved: {pg.title}
                </div>
              )}
            </div>
          </div>
        ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
