import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Lock, CheckCircle, Music, Upload as UploadIcon, X, Camera, Users, UserPlus, UserMinus, LogOut, Timer } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { MOCK_SONGS } from '../lib/mockData'
import { isActiveMember, planDays } from '../lib/membership'
import { analyzeFullBuffer } from 'realtime-bpm-analyzer'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'sigidrigi2025'
const EDITOR_PASSWORD = import.meta.env.VITE_EDITOR_PASSWORD || 'admin'
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
  const [form, setForm] = useState(song || { title: '', artist: '', composer: '', category: '', chords: '', lyrics: '', bpm: '', intro: '', province: '', source: '', reference_url: '', instrumental_url: '', social_url: '', free: false, verified: false, audio_url: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [bpmDetecting, setBpmDetecting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title?.trim()) { setError('Title is required.'); return }
    if (!form.category?.trim()) { setError('Category is required.'); return }
    setSaving(true)
    setError(null)
    const payload = { ...form, bpm: form.bpm ? parseInt(form.bpm) : null, intro: form.intro ? parseFloat(form.intro) : null }
    // Don't send an empty chords value — keeps saves working until the chords column exists
    if (!payload.chords) delete payload.chords
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
          {[['Title', 'title'], ['Artist', 'artist'], ['Composer', 'composer'], ['Category', 'category'], ['Province', 'province'], ['Source', 'source'], ['Reference URL (artist video — visible)', 'reference_url'], ['Instrumental (YouTube — hidden in Sing Mode)', 'instrumental_url'], ['Artist Social Link (Instagram, Facebook, TikTok…)', 'social_url'], ['Intro (seconds)', 'intro']].map(([label, field]) => (
            <div key={field}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>{label}</p>
              <input style={inputStyle} value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            </div>
          ))}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Chords (so the band doesn't have to guess — tap to build, e.g. G C D)</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {['G', 'C', 'D', 'E', 'A', 'F', 'B7', 'Am', 'Dm', 'Em'].map(k => (
                <button key={k} type="button" onClick={() => setForm(f => ({ ...f, chords: ((f.chords || '') + ' ' + k).trim() }))}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--gold)', fontWeight: 700, fontSize: 13, padding: '7px 13px', cursor: 'pointer' }}>
                  {k}
                </button>
              ))}
              {form.chords && (
                <button type="button" onClick={() => setForm(f => ({ ...f, chords: '' }))}
                  style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 8, color: 'var(--danger)', fontWeight: 700, fontSize: 13, padding: '7px 13px', cursor: 'pointer' }}>
                  ✕ clear
                </button>
              )}
            </div>
            <input style={inputStyle} value={form.chords || ''} onChange={e => setForm(f => ({ ...f, chords: e.target.value }))} placeholder="e.g. G C D — or type any chords (Bb, F#m…)" />
          </div>
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
            <Music size={13} /> Audio file (MP3 — optional fallback)
          </p>
          <AudioUploader value={form.audio_url} onChange={url => setForm(f => ({ ...f, audio_url: url }))}
            onBpmDetecting={() => setBpmDetecting(true)}
            onBpmDetected={bpm => { setBpmDetecting(false); if (bpm) setForm(f => ({ ...f, bpm: String(bpm) })) }} />
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

const mBtnPrimary = { background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, fontSize: 12, padding: '7px 12px', cursor: 'pointer' }
const mBtnSecondary = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontWeight: 600, fontSize: 12, padding: '7px 12px', cursor: 'pointer' }
const mBtnDanger = { background: 'rgba(255,107,107,0.1)', border: 'none', borderRadius: 8, color: 'var(--danger)', fontWeight: 600, fontSize: 12, padding: '7px 12px', cursor: 'pointer' }

function MembersPanel({ members, filter, setFilter, onActivate, onRenew, onDeactivate }) {
  const now = new Date()
  const sevenDays = new Date(now); sevenDays.setDate(sevenDays.getDate() + 7)
  const active = m => m.status === 'active' && m.expires_at && new Date(m.expires_at) > now
  const buckets = {
    pending: members.filter(m => m.status === 'pending'),
    active: members.filter(active),
    expiring: members.filter(m => active(m) && new Date(m.expires_at) <= sevenDays),
    expired: members.filter(m => !active(m) && m.status !== 'pending'),
  }
  const list = buckets[filter] || []
  const filters = [['pending', 'Pending'], ['active', 'Active'], ['expiring', 'Expiring'], ['expired', 'Expired']]
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{ background: filter === id ? 'rgba(0,229,160,0.12)' : 'var(--bg2)', border: filter === id ? '1px solid var(--accent)' : '1px solid transparent', borderRadius: 999, color: filter === id ? 'var(--accent)' : 'var(--text2)', fontWeight: 700, fontSize: 11, padding: '6px 12px', cursor: 'pointer' }}>
            {label}{buckets[id]?.length ? ` · ${buckets[id].length}` : ''}
          </button>
        ))}
      </div>
      {list.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14, padding: '14px 0' }}>No {filter} members.</p>}
      {list.map(m => (
        <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email || '—'}</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {m.reference_code ? `${m.reference_code} · ` : ''}{m.payment_method || ''}
            {m.amount_paid ? ` · $${m.amount_paid}${planDays(m.amount_paid) === 365 ? ' (annual)' : ''}` : ''}
            {m.expires_at ? ` · until ${new Date(m.expires_at).toLocaleDateString()}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {m.status === 'pending' && <button onClick={() => onActivate(m)} style={mBtnPrimary}>✓ Activate ({planDays(m.amount_paid)} days)</button>}
            {active(m) && <button onClick={() => onRenew(m)} style={mBtnSecondary}>+{planDays(m.amount_paid)} days</button>}
            {active(m) && <button onClick={() => onDeactivate(m)} style={mBtnDanger}>Deactivate</button>}
            {!active(m) && m.status !== 'pending' && <button onClick={() => onActivate(m)} style={mBtnPrimary}>Reactivate ({planDays(m.amount_paid)} days)</button>}
          </div>
        </div>
      ))}
    </div>
  )
}

function Dashboard({ songs, members, unverified, onActivate, goMembers, nav }) {
  const now = new Date()
  const in7 = new Date(now); in7.setDate(in7.getDate() + 7)
  const active = members.filter(isActiveMember)
  const pending = members.filter(m => m.status === 'pending')
  const expiring = active.filter(m => m.expires_at && new Date(m.expires_at) <= in7)
  // "Timed" = any exact timing: full karaoke line_timings OR quick-sync intro+sing_end
  const synced = songs.filter(s => (Array.isArray(s.line_timings) && s.line_timings.length > 0)
    || ((s.intro || 0) > 0 && Number(s.sing_end) > 0))
  const withInstr = songs.filter(s => s.instrumental_url)
  const annualCount = active.filter(m => planDays(m.amount_paid) === 365).length
  // Monthly-equivalent revenue: annual subs amortised over 12 months.
  const mrr = Math.round(active.reduce((sum, m) =>
    sum + (planDays(m.amount_paid) === 365 ? Number(m.amount_paid || 50) / 12 : Number(m.amount_paid || 5)), 0))
  const syncPct = songs.length ? Math.round((synced.length / songs.length) * 100) : 0

  const statCard = (value, label, color) => (
    <div style={{ flex: 1, background: 'var(--bg1)', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
      <span className="font-playfair" style={{ fontSize: 26, fontWeight: 800, color, display: 'block', lineHeight: 1, marginBottom: 4 }}>{value}</span>
      <span style={{ fontSize: 10.5, color: 'var(--text3)', fontWeight: 500 }}>{label}</span>
    </div>
  )

  return (
    <div style={{ padding: '0 20px' }}>
      {/* Revenue hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,229,160,0.12), rgba(0,229,160,0.03))', border: '1px solid rgba(0,229,160,0.25)', borderRadius: 18, padding: '18px 20px', marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Est. monthly revenue</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="font-playfair" style={{ fontSize: 42, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>${mrr}</span>
          <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>/ mo</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
          {active.length} active {active.length === 1 ? 'subscriber' : 'subscribers'}
          {annualCount > 0 ? ` · ${annualCount} annual` : ''}
        </p>
      </div>

      {/* Member stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {statCard(active.length, 'Active', 'var(--accent)')}
        {statCard(pending.length, 'Pending', pending.length ? 'var(--gold)' : 'var(--text)')}
        {statCard(expiring.length, 'Expiring ≤7d', expiring.length ? 'var(--danger)' : 'var(--text)')}
      </div>

      {/* Catalogue health */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text3)', textTransform: 'uppercase', margin: '6px 0 10px' }}>Catalogue</p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {statCard(songs.length, 'Songs', 'var(--text)')}
        {statCard(`${synced.length}`, `Timed · ${syncPct}%`, 'var(--accent)')}
        {statCard(withInstr.length, 'Backing', 'var(--text)')}
        {statCard(unverified.length, 'To verify', unverified.length ? 'var(--gold)' : 'var(--text)')}
      </div>

      {/* Action items */}
      {(pending.length > 0 || expiring.length > 0 || (songs.length - synced.length) > 0) && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text3)', textTransform: 'uppercase', margin: '10px 0 10px' }}>Needs attention</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {pending.length > 0 && (
              <button onClick={goMembers} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.3)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', color: 'var(--text)', textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>💰 {pending.length} payment{pending.length > 1 ? 's' : ''} to confirm</span>
                <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>Review →</span>
              </button>
            )}
            {expiring.length > 0 && (
              <button onClick={goMembers} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', color: 'var(--text)', textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>⏳ {expiring.length} expiring this week</span>
                <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>Review →</span>
              </button>
            )}
            {(songs.length - synced.length) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>🎵 {songs.length - synced.length} songs need timing (Quick sync ⏱)</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick-activate pending payers */}
      {pending.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text3)', textTransform: 'uppercase', margin: '10px 0 8px' }}>Pending payments</p>
          {pending.slice(0, 4).map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email || '—'}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>{m.reference_code || ''}{m.amount_paid ? ` · $${m.amount_paid}${planDays(m.amount_paid) === 365 ? ' annual' : ''}` : ''}{m.payment_method ? ` · ${m.payment_method}` : ''}</p>
              </div>
              <button onClick={() => onActivate(m)} style={{ ...mBtnPrimary, flexShrink: 0 }}>✓ Activate ({planDays(m.amount_paid)}d)</button>
            </div>
          ))}
          {pending.length > 4 && (
            <button onClick={goMembers} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: 13, padding: '12px', cursor: 'pointer' }}>
              View all {pending.length} pending →
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function Admin() {
  const nav = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [isEditor, setIsEditor] = useState(false)
  const [editorName, setEditorName] = useState('')
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
  const [tab, setTab] = useState('songs')
  const [memberFilter, setMemberFilter] = useState('pending')
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [editors, setEditors] = useState([])
  const [newEditorEmail, setNewEditorEmail] = useState('')
  const [newEditorName, setNewEditorName] = useState('')
  const [editorSaving, setEditorSaving] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Auto-unlock if logged-in user is a registered editor/admin
  useEffect(() => {
    async function checkRole() {
      if (!isConfigured) return
      const { data: { user } } = await supabase.auth.getUser()
      setLoggedInUser(user || null)
      if (!user?.email) return
      const { data } = await supabase.from('admins').select('role,name').eq('email', user.email).single()
      if (data?.role === 'editor' || data?.role === 'admin') {
        setIsEditor(data.role === 'editor')
        setEditorName(data.name || user.email)
        setTab(data.role === 'editor' ? 'songs' : 'dashboard')
        setUnlocked(true)
        loadData()
      }
    }
    checkRole()
  }, [])

  function unlock() {
    if (pw === ADMIN_PASSWORD) { setUnlocked(true); setIsEditor(false); setTab('dashboard'); loadData() }
    else if (pw === EDITOR_PASSWORD) { setUnlocked(true); setIsEditor(true); setEditorName('Editor'); setTab('songs'); loadData() }
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
    const [{ data: s }, { data: m }, { data: u }, { data: e }] = await Promise.all([
      supabase.from('songs').select('*').order('title'),
      supabase.from('members').select('*').order('subscribed_at', { ascending: false }),
      supabase.from('songs').select('id').eq('verified', false),
      supabase.from('admins').select('*').order('name'),
    ])
    setSongs(s || [])
    setMembers(m || [])
    setUnverified(u || [])
    setEditors(e || [])
    setLoading(false)
  }

  async function addEditor() {
    if (!newEditorEmail.trim()) return
    setEditorSaving(true)
    await supabase.from('admins').upsert({ email: newEditorEmail.trim().toLowerCase(), role: 'editor', name: newEditorName.trim() || newEditorEmail.trim() })
    setNewEditorEmail('')
    setNewEditorName('')
    setEditorSaving(false)
    showToast('Editor added')
    loadData()
  }

  async function removeEditor(email) {
    await supabase.from('admins').delete().eq('email', email)
    showToast('Editor removed')
    loadData()
  }

  async function handleDelete(id) {
    await supabase.from('songs').delete().eq('id', id)
    setDeleteId(null)
    showToast('Song deleted')
    loadData()
  }

  async function activateMember(m) {
    const now = new Date()
    const days = planDays(m.amount_paid)
    const expires = new Date(now)
    expires.setDate(expires.getDate() + days)
    await supabase.from('members').update({ status: 'active', paid_at: now.toISOString(), expires_at: expires.toISOString() }).eq('id', m.id)
    showToast(`${m.email} activated — expires in ${days} days`)
    loadData()
  }
  async function renewMember(m) {
    const days = planDays(m.amount_paid)
    const base = m.expires_at && new Date(m.expires_at) > new Date() ? new Date(m.expires_at) : new Date()
    base.setDate(base.getDate() + days)
    await supabase.from('members').update({ status: 'active', expires_at: base.toISOString() }).eq('id', m.id)
    showToast(`${m.email} renewed +${days} days`)
    loadData()
  }
  async function deactivateMember(m) {
    await supabase.from('members').update({ status: 'expired' }).eq('id', m.id)
    showToast(`${m.email} deactivated`)
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
          {!loggedInUser && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <button onClick={() => nav('/account')}
                style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 15, padding: '14px', cursor: 'pointer' }}>
                Sign in as Editor
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>
            {isEditor ? `EDITOR — ${editorName}` : 'ADMIN'}
          </p>
          <h1 className="font-playfair" style={{ fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            Manage songs <Lock size={16} color="var(--accent)" />
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {isEditor && (
            <button onClick={async () => { await supabase.auth.signOut(); nav('/') }} title="Sign out"
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={18} color="var(--text2)" />
            </button>
          )}
          <button onClick={() => nav('/upload')} title="Photograph a songbook page"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={18} color="var(--accent)" />
          </button>
          <button onClick={() => nav('/lyric-sync')} title="Add song with karaoke timing"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Music size={18} color="var(--accent)" />
          </button>
          <button onClick={() => { setEditSong(null); setShowForm(true) }} title="Add song manually"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={20} color="#000" />
          </button>
        </div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px', marginBottom: 18 }}>
        {[...(!isEditor ? [['dashboard', 'Home']] : []), ['songs', 'Songs'], ...(!isEditor ? [['members', 'Members'], ['editors', 'Editors']] : [])].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, background: tab === id ? 'rgba(0,229,160,0.1)' : 'var(--bg2)', border: tab === id ? '1.5px solid var(--accent)' : '1.5px solid transparent', borderRadius: 10, color: tab === id ? 'var(--accent)' : 'var(--text2)', fontWeight: 700, fontSize: 13, padding: '9px', cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && !isEditor && (
        <Dashboard songs={songs} members={members} unverified={unverified}
          onActivate={activateMember}
          goMembers={() => { setMemberFilter('pending'); setTab('members') }}
          nav={nav} />
      )}

      {tab === 'songs' && (
      <>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 20 }}>
        {[
          { label: 'Total songs', value: songs.length, color: 'var(--text)' },
          { label: 'Members', value: members.filter(isActiveMember).length, color: 'var(--accent)' },
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
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>
                {song.category} · {song.free ? 'Free' : 'Members'}
                {song.line_timings?.length > 0 && <span style={{ color: 'var(--accent)' }}> · ✓ synced</span>}
                {!(song.line_timings?.length > 0) && (song.intro || 0) > 0 && Number(song.sing_end) > 0 && <span style={{ color: 'var(--gold)' }}> · ⏱ timed</span>}
              </p>
            </div>
            <button onClick={() => nav(`/tap-sync/${song.id}`)} title="Tap-sync karaoke timing"
              style={{ width: 34, height: 34, borderRadius: 8, background: song.line_timings?.length > 0 ? 'rgba(0,229,160,0.12)' : 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: song.line_timings?.length > 0 ? 'var(--accent)' : 'var(--text2)', flexShrink: 0 }}>
              <Timer size={14} />
            </button>
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
      </>
      )}

      {tab === 'members' && (
        <MembersPanel members={members} filter={memberFilter} setFilter={setMemberFilter}
          onActivate={activateMember} onRenew={renewMember} onDeactivate={deactivateMember} />
      )}

      {tab === 'editors' && (
        <div style={{ padding: '0 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={12} color="var(--accent)" /> Team editors
          </p>

          {/* Add new editor */}
          <div style={{ background: 'var(--bg1)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Add editor</p>
            <input value={newEditorName} onChange={e => setNewEditorName(e.target.value)} placeholder="Name (e.g. Salesi)"
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '11px 13px', outline: 'none', marginBottom: 8, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
            <input value={newEditorEmail} onChange={e => setNewEditorEmail(e.target.value)} placeholder="Email address"
              type="email"
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '11px 13px', outline: 'none', marginBottom: 10, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
            <button onClick={addEditor} disabled={editorSaving || !newEditorEmail.trim()}
              style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, fontSize: 14, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !newEditorEmail.trim() ? 0.5 : 1 }}>
              <UserPlus size={16} /> {editorSaving ? 'Adding…' : 'Add Editor'}
            </button>
          </div>

          {/* Current editors */}
          {editors.map(e => (
            <div key={e.email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: e.role === 'admin' ? 'rgba(0,229,160,0.15)' : 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="font-playfair" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 16 }}>{(e.name || e.email)[0].toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{e.name || e.email}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{e.email} · {e.role}</p>
              </div>
              {e.role !== 'admin' && (
                <button onClick={() => removeEditor(e.email)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
                  <UserMinus size={18} color="var(--danger)" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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

      {/* Toast notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 24, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', animation: 'fadeInUp 0.2s ease' }}>
          ✓ {toast}
        </div>
      )}

      {showForm && <SongFormSheet song={editSong} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); showToast(editSong ? 'Song updated' : 'Song added'); loadData() }} />}
    </div>
  )
}
