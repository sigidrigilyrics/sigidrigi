import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight, Heart, Star, Shield, Info, Music, FileText, Lock, Copyright, PenLine } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { loadCatalog } from '../lib/songs'
import { useFavorites } from '../lib/favorites'
import { useMembership } from '../lib/membership'
import LoginSheet from '../components/LoginSheet'
import SubscribeSheet from '../components/SubscribeSheet'

export default function Account() {
  const nav = useNavigate()
  const { favorites } = useFavorites()
  const { user, member, isMember, refresh } = useMembership()
  const [songs, setSongs] = useState([])
  const [showLogin, setShowLogin] = useState(false)
  const [showSubscribe, setShowSubscribe] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [editorRole, setEditorRole] = useState(null)
  // Surface a failed Google sign-in (stored by the deep-link handler in App.jsx)
  const [loginError, setLoginError] = useState(() => {
    try {
      const msg = sessionStorage.getItem('login_error')
      if (msg) sessionStorage.removeItem('login_error')
      return msg || null
    } catch { return null }
  })

  useEffect(() => {
    loadCatalog().then(({ songs }) => setSongs(songs))
  }, [])

  useEffect(() => {
    async function checkEditorRole() {
      if (!isConfigured || !user?.email) return
      const { data } = await supabase.from('admins').select('role').eq('email', user.email).single()
      if (data?.role) setEditorRole(data.role)
    }
    checkEditorRole()
  }, [user])

  async function handleLogout() {
    await supabase.auth.signOut()
    refresh()
  }

  const favSongs = favorites.map(id => songs.find(s => s.id === id)).filter(Boolean)
  const plan = isMember ? 'Member' : member?.status === 'pending' ? 'Pending' : 'Free'
  const planColor = plan === 'Member' ? 'var(--accent)' : plan === 'Pending' ? 'var(--gold)' : 'var(--text3)'
  const expiryDate = isMember && member?.expires_at ? new Date(member.expires_at).toLocaleDateString() : null

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>Bula</p>
        <h1 className="font-playfair" style={{ fontSize: 32, fontWeight: 800 }}>Account</h1>
      </div>

      {/* Failed sign-in notice (from the OAuth deep-link handler) */}
      {loginError && !user && (
        <div style={{ margin: '0 20px 14px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.35)', borderRadius: 14, padding: '12px 14px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', marginBottom: 3 }}>Sign-in didn't finish</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{loginError}</p>
          <button onClick={() => { setLoginError(null); setShowLogin(true) }}
            style={{ marginTop: 8, background: 'var(--danger)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 12.5, padding: '8px 16px', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      )}

      {/* Profile card */}
      <div style={{ margin: '0 20px 16px', background: 'var(--bg1)', borderRadius: 18, padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="font-playfair" style={{ color: '#000', fontWeight: 800, fontSize: 22 }}>
              {user ? user.email?.[0]?.toUpperCase() : 'S'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user ? user.email : 'Guest'}
            </p>
            <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: planColor, border: `1px solid ${planColor}`, borderRadius: 999, padding: '2px 9px' }}>
              {plan.toUpperCase()} PLAN
            </span>
            {expiryDate && <span style={{ display: 'block', marginTop: 5, fontSize: 11, color: 'var(--text3)' }}>Active until {expiryDate}</span>}
          </div>
        </div>
        {user ? (
          <button onClick={handleLogout}
            style={{ width: '100%', marginTop: 16, background: 'var(--bg2)', border: 'none', borderRadius: 12, color: 'var(--text2)', fontWeight: 600, fontSize: 14, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={15} /> Log out
          </button>
        ) : (
          <button onClick={() => setShowLogin(true)}
            style={{ width: '100%', marginTop: 16, background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 14, padding: '13px', cursor: 'pointer' }}>
            Log in / Sign up
          </button>
        )}
      </div>

      {/* Subscription card */}
      {plan !== 'Member' && (
        <div style={{ margin: '0 20px 16px', background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Star size={22} color="var(--gold)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{plan === 'Pending' ? 'Membership pending' : 'Go Premium — $5/mo'}</p>
            <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
              {plan === 'Pending' ? "We'll confirm your payment soon" : 'Full archive + instrumentals'}
            </p>
          </div>
          {plan !== 'Pending' && (
            <button onClick={() => setShowSubscribe(true)}
              style={{ background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 16px', cursor: 'pointer', flexShrink: 0 }}>
              Join
            </button>
          )}
        </div>
      )}

      {/* Favorites */}
      <div style={{ padding: '0 20px', marginBottom: 24 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Heart size={12} color="var(--accent)" /> My favorites
          {favSongs.length > 0 && <span style={{ color: 'var(--text3)' }}>· {favSongs.length}</span>}
        </h3>
        {favSongs.length === 0 ? (
          <div style={{ background: 'var(--bg1)', borderRadius: 14, padding: '22px 16px', textAlign: 'center' }}>
            <Heart size={22} color="var(--text3)" style={{ marginBottom: 8 }} />
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>Tap the ♥ on any song to save it here.</p>
          </div>
        ) : (
          favSongs.map(song => (
            <button key={song.id} onClick={() => nav(`/song/${song.id}`)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="font-playfair" style={{ color: 'var(--accent)', fontSize: 18, fontWeight: 700 }}>{song.title?.[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{song.category} · {song.artist || 'Traditional'}</p>
              </div>
              <ChevronRight size={16} color="var(--text3)" style={{ flexShrink: 0 }} />
            </button>
          ))
        )}
      </div>

      {/* Editor — Manage Songs button */}
      {editorRole === 'editor' && (
        <div style={{ margin: '0 20px 16px' }}>
          <button onClick={() => nav('/admin')}
            style={{ width: '100%', background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--accent)', borderRadius: 16, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
            <PenLine size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Manage Songs</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Add, edit or update song lyrics</p>
            </div>
            <ChevronRight size={16} color="var(--accent)" />
          </button>
        </div>
      )}

      {/* Menu */}
      <div style={{ padding: '0 20px' }}>
        {[
          ...(editorRole === 'admin' ? [{ label: 'Admin', icon: Shield, onClick: () => nav('/admin') }] : []),
          { label: 'About Sigidrigi', icon: Info, onClick: () => setShowAbout(true) },
          { label: 'Terms of Use', icon: FileText, onClick: () => nav('/terms') },
          { label: 'Privacy Policy', icon: Lock, onClick: () => nav('/privacy') },
          { label: 'Copyright', icon: Copyright, onClick: () => nav('/copyright') },
        ].map(({ label, icon: Icon, onClick }) => (
          <button key={label} onClick={onClick}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
            <Icon size={17} color="var(--text2)" />
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
            <ChevronRight size={16} color="var(--text3)" />
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 11, marginTop: 24 }}>
        Sigidrigi · Fijian songbook · v1.0
      </p>

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
      {showSubscribe && <SubscribeSheet onClose={() => setShowSubscribe(false)} />}
      {showAbout && <AboutSheet onClose={() => setShowAbout(false)} />}
    </div>
  )
}

function AboutSheet({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#141414', borderRadius: '28px 28px 0 0', padding: '12px 22px 40px' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Music size={20} color="var(--accent)" />
          <h2 className="font-playfair" style={{ fontSize: 24, fontWeight: 700 }}>About Sigidrigi</h2>
        </div>
        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 14 }}>
          Sigidrigi is a living archive of Fijian songs — the music of the kava mat, the church, and the gathering. Browse the lyrics, learn the words, and sing along in Sing Mode with auto-scrolling lyrics.
        </p>
        <p style={{ color: 'var(--text3)', fontSize: 12.5, lineHeight: 1.6 }}>
          Built for Fiji and the diaspora, with love. Vinaka vakalevu for supporting our music.
        </p>
        <button onClick={onClose}
          style={{ width: '100%', marginTop: 22, background: 'var(--bg2)', border: 'none', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 14, padding: '13px', cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  )
}
