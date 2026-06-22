import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'

export default function LoginSheet({ onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isConfigured) { setError('Add Supabase credentials to .env.local to enable login.'); return }
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
