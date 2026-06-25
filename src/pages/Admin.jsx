import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Lock, CheckCircle, Music, Upload as UploadIcon, X, Camera } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { MOCK_SONGS } from '../lib/mockData'
import { analyzeFullBuffer } from 'realtime-bpm-analyzer'

const ADMIN_PASSWORD = 'sigidrigi2025'
const BUCKET = 'instrumentals'

function AudioUploader({ value, onChange, onBpmDetecting, onBpmDetected }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [progress, setProgress] = useState(0)

  async function handleFile(file) {
    if (!file) return
    if (!isConfigured) {
      setUploadError('Add Supabase credentials to .env.local before uploading.')
      return
    }
    setUploading(true)
    setUploadError(null)
    setProgress(0)

    // BPM detection runs in parallel with upload
    if (onBpmDetected) {
      onBpmDetecting?.()
      ;(async () => {
        try {
          const arrayBuffer = await file.arrayBuffer()
          const audioCtx = new AudioContext()
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
          const result = await analyzeFullBuffer(audioBuffer)
          const tempo = result?.topCandidates?.[0]?.tempo
          if (tempo) onBpmDetected(Math.round(tempo))
          await audioCtx.close()
        } catch {
          onBpmDetected(null)
        }
      })()
    }

    const path = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (error) {
      setUploadError(error.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
    onChange(publicUrl)
    setUploading(false)
    setProgress(100)
  }

  const fileName = value ? value.split('/').pop() : null

  return (
    <div style={{ marginBottom: 10 }}>
      <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])} />

      {value ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Music size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</p>
            <audio controls src={value} style={{ width: '100%', height: 28, marginTop: 4, accentColor: 'var(--accent)' }} />
          </div>
          <button type="button" onClick={() => onChange('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ width: '100%', background: uploading ? 'var(--bg2)' : 'rgba(0,229,160,0.06)', border: '1.5px dashed rgba(0,229,160,0.3)', borderRadius: 10, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: uploading ? 'var(--text3)' : 'var(--accent)', fontWeight: 600, fontSize: 13 }}>
          <UploadIcon size={15} />
          {uploading ? `Uploading…` : 'Upload MP3 / audio file'}
        </button>
      )}

      {/* Also allow pasting a URL directly */}
      <input placeholder="…or paste a URL"
        value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12, padding: '8px 12px', outline: 'none', fontFamily: 'Inter, sans-serif', marginTop: 6, color: 'var(--text2)' }} />

      {uploadError && <p style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{uploadError}</p>}
    </div>
  )
}

function SongFormSheet({ song, onClose, onSaved }) {
  const [form, setForm] = useState(song || { title: '', artist: '', composer: '', category: '', lyrics: '', bpm: '', intro: '', province: '', source: '', reference_url: '', instrumental_url: '', free: false, verified: false, audio_url: '', audio_url_full: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [bpmDetecting, setBpmDetecting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { ...form, bpm: form.bpm ? parseInt(form.bpm) : null, intro: form.intro ? parseFloat(form.intro) : null }
    let err
    if (song?.id) {
      ({ error: err } = await supabase.from('songs').update(payload).eq('id', song.id))
    } else {
      ({ error: err } = await supabase.from('songs').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  const inputStyle = { width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '11px 12px', outline: 'none', fontFamily: 'Inter, sans-serif', marginBottom: 10 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#141414', borderRadius: '28px 28px 0 0', padding: '16px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
        <h2 className="font-playfair" style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{song?.id ? 'Edit song' : 'Add song'}</h2>
        <form onSubmit={handleSubmit}>
          {[['Title', 'title'], ['Artist', 'artist'], ['Composer', 'composer'], ['Category', 'category'], ['Province', 'province'], ['Source', 'source'], ['Reference URL (artist video — visible)', 'reference_url'], ['Instrumental (YouTube — hidden in Sing Mode)', 'instrumental_url'], ['Intro (seconds)', 'intro']].map(([label, field]) => (
            <div key={field}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>{label}</p>
              <input style={inputStyle} value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            </div>
          ))}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              BPM
              {bpmDetecting && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.05em' }}>Detecting…</span>}
              {!bpmDetecting && form.bpm && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>✓ auto-detected</span>}
            </p>
            <input style={inputStyle} value={form.bpm || ''} onChange={e => setForm(f => ({ ...f, bpm: e.target.value }))} placeholder="e.g. 120" />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Lyrics</p>
          <textarea style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} value={form.lyrics || ''} onChange={e => setForm(f => ({ ...f, lyrics: e.target.value }))} />
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Music size={13} /> Acoustic Guitar
          </p>
          <AudioUploader value={form.audio_url} onChange={url => setForm(f => ({ ...f, audio_url: url }))}
            onBpmDetecting={() => setBpmDetecting(true)}
            onBpmDetected={bpm => { setBpmDetecting(false); if (bpm) setForm(f => ({ ...f, bpm: String(bpm) })) }} />
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Music size={13} /> Full Instrumental
          </p>
          <AudioUploader value={form.audio_url_full} onChange={url => setForm(f => ({ ...f, audio_url_full: url }))} />
          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text2)' }}>
              <input type="checkbox" checked={form.free} onChange={e => setForm(f => ({ ...f, free: e.target.checked }))} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              Free
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text2)' }}>
              <input type="checkbox" checked={form.verified} onChange={e => setForm(f => ({ ...f, verified: e.target.checked }))} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              Verified
            </label>
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <button type="submit" disabled={saving}
            style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const nav = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)
  const [songs, setSongs] = useState([])
  const [members, setMembers] = useState([])
  const [unverified, setUnverified] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [editSong, setEditSong] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  function unlock() {
    if (pw === ADMIN_PASSWORD) { setUnlocked(true); loadData() }
    else setPwError(true)
  }

  async function loadData() {
    setLoading(true)
    if (!isConfigured) {
      setSongs([...MOCK_SONGS])
      setMembers([])
      setUnverified(MOCK_SONGS.filter(s => !s.verified).map(s => ({ id: s.id })))
      setLoading(false)
      return
    }
    const [{ data: s }, { data: m }, { data: u }] = await Promise.all([
      supabase.from('songs').select('*').order('title'),
      supabase.from('members').select('id').eq('status', 'active'),
      supabase.from('songs').select('id').eq('verified', false),
    ])
    setSongs(s || [])
    setMembers(m || [])
    setUnverified(u || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    await supabase.from('songs').delete().eq('id', id)
    setDeleteId(null)
    loadData()
  }

  const filtered = songs.filter(s => !query || s.title?.toLowerCase().includes(query.toLowerCase()))

  if (!unlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,229,160,0.1)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Lock size={24} color="var(--accent)" />
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>ADMIN</p>
          <h1 className="font-playfair" style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>Manage songs</h1>
          <input type="password" placeholder="Admin password" value={pw} onChange={e => { setPw(e.target.value); setPwError(false) }}
            onKeyDown={e => e.key === 'Enter' && unlock()}
            style={{ width: '100%', background: 'var(--bg2)', border: pwError ? '1px solid var(--danger)' : '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 15, padding: '13px 14px', outline: 'none', marginBottom: 12, fontFamily: 'Inter, sans-serif' }} />
          {pwError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>Incorrect password</p>}
          <button onClick={unlock}
            style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', cursor: 'pointer' }}>
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>ADMIN</p>
          <h1 className="font-playfair" style={{ fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            Manage songs <Lock size={16} color="var(--accent)" />
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => nav('/upload')} title="Photograph a songbook page"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={18} color="var(--accent)" />
          </button>
          <button onClick={() => { setEditSong(null); setShowForm(true) }} title="Add song manually"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={20} color="#000" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 20 }}>
        {[
          { label: 'Total songs', value: songs.length, color: 'var(--text)' },
          { label: 'Members', value: members.length, color: 'var(--accent)' },
          { label: 'To verify', value: unverified.length, color: 'var(--gold)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, background: 'var(--bg1)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
            <span className="font-playfair" style={{ fontSize: 28, fontWeight: 800, color, display: 'block', lineHeight: 1, marginBottom: 4 }}>{value}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px', marginBottom: 16 }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
          <Search size={15} color="var(--text3)" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search songs…"
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, flex: 1, fontFamily: 'Inter, sans-serif' }} />
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 30 }}>Loading…</div>}

      {/* Song list */}
      <div style={{ padding: '0 20px' }}>
        {filtered.map(song => (
          <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                {song.verified && <CheckCircle size={12} color="var(--accent)" style={{ flexShrink: 0 }} />}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{song.category} · {song.free ? 'Free' : 'Members'}</p>
            </div>
            <button onClick={() => { setEditSong(song); setShowForm(true) }}
              style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', flexShrink: 0 }}>
              <Pencil size={14} />
            </button>
            <button onClick={() => setDeleteId(song.id)}
              style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,107,107,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', flexShrink: 0 }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && !loading && (
          <p style={{ color: 'var(--text3)', fontSize: 14, padding: '20px 0' }}>No songs found.</p>
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setDeleteId(null)} />
          <div style={{ position: 'relative', background: 'var(--bg1)', borderRadius: 20, padding: 24, margin: 20, maxWidth: 340, width: '100%' }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Delete song?</h3>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, background: 'var(--bg2)', border: 'none', borderRadius: 10, color: 'var(--text)', fontWeight: 600, padding: '12px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, background: 'var(--danger)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '12px', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && <SongFormSheet song={editSong} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadData() }} />}
    </div>
  )
}
