import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { signInWithGoogle } from '../lib/auth'

export default function LoginSheet({ onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  // Close the sheet the moment auth succeeds — by any method. Email login also calls
  // onClose() directly, but native Google finishes asynchronously via the deep-link
  // callback, so without this the sheet stays open on top of the app after sign-in.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) onClose()
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [onClose])

  async function handleGoogle() {
    if (!isConfigured) { setError('Add Supabase credentials to .env.local to enable login.'); return }
    setGoogleLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      // Web navigates away; native hands off to the system browser and returns via a
      // deep link. Either way, don't leave the button stuck on "Connecting…" forever.
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isConfigured) { setError('Add Supabase credentials to .env.local to enable login.'); return }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSent(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 12, color: 'var(--text)', fontSize: 15, padding: '13px 14px',
    outline: 'none', marginBottom: 10
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#141414', borderRadius: '28px 28px 0 0', padding: '12px 20px 40px' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="font-playfair" style={{ fontSize: 24, fontWeight: 700 }}>
            {mode === 'login' ? 'Welcome back' : 'Join Sigidrigi'}
          </h2>
          <button onClick={onClose} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: 'var(--accent)', fontSize: 40, marginBottom: 12 }}>✓</div>
            <p style={{ fontWeight: 600 }}>Check your email!</p>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 6 }}>Click the link we sent to confirm your account.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Google sign-in */}
            <button type="button" onClick={handleGoogle} disabled={googleLoading || loading}
              style={{ width: '100%', background: '#fff', border: 'none', borderRadius: 14, color: '#1f1f1f', fontWeight: 600, fontSize: 15, padding: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
              </svg>
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 14, color: '#000', fontWeight: 700, fontSize: 15, padding: '15px', cursor: 'pointer', boxShadow: '0 8px 22px rgba(0,229,160,0.3)', marginBottom: 14, marginTop: 4 }}>
              {loading ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already a member? '}
              <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </span>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
