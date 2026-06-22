import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Camera, CheckCircle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const BUCKET = 'instrumentals'

export default function Upload() {
  const nav = useNavigate()
  const fileRef = useRef(null)
  const [pages, setPages] = useState([]) // { name, url, preview }
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState(null)

  async function handleFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setError(null)
    setUploading(true)
    setProgress({ done: 0, total: files.length })
    let done = 0
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx]
      try {
        const path = `pages/${Date.now()}-${idx}-${file.name.replace(/\s+/g, '-')}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
        setPages(p => [...p, { name: file.name, url: publicUrl, preview: URL.createObjectURL(file) }])
      } catch (e) {
        setError(`${file.name}: ${e.message || 'upload failed'}`)
      }
      done++
      setProgress({ done, total: files.length })
    }
    setUploading(false)
  }

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '52px 20px 6px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-playfair" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>Digitize songbook</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Photograph pages — we'll transcribe them</p>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Capture button */}
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ width: '100%', background: 'rgba(0,229,160,0.06)', border: '2px dashed rgba(0,229,160,0.35)', borderRadius: 18, padding: '34px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Camera size={32} color="var(--accent)" />
          <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>{uploading ? `Uploading ${progress.done}/${progress.total}…` : 'Add songbook pages'}</p>
          <p style={{ color: 'var(--text3)', fontSize: 12 }}>Take photos or pick several from your gallery</p>
        </button>

        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)} />

        {error && (
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: 12, marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>
        )}

        {/* Uploaded pages */}
        {pages.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase' }}>
                {pages.length} page{pages.length !== 1 ? 's' : ''} uploaded
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {pages.map((pg, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 12, overflow: 'hidden', background: 'var(--bg2)' }}>
                  <img src={pg.preview} alt={`Page ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex' }}>
                    <CheckCircle size={16} color="var(--accent)" />
                  </span>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 14, padding: '14px 16px' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)', marginBottom: 4 }}>✓ Pages saved to the cloud</p>
              <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>
                Your photos are uploaded. Tell Claude "transcribe my songbook pages" and they'll be read, cleaned up, and added as songs.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
