import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Post-login landing: a warm confirmation instead of dropping the user back on
// the login form. Shows who they're signed in as, then continues to Home.
export default function Welcome() {
  const nav = useNavigate()
  const [name, setName] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) { nav('/', { replace: true }); return }
      const display = user.user_metadata?.full_name || user.user_metadata?.name || (user.email || '').split('@')[0]
      setName(display)
    }).catch(() => nav('/', { replace: true }))
    const t = setTimeout(() => nav('/', { replace: true }), 2800)
    return () => { cancelled = true; clearTimeout(t) }
  }, [nav])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '0 32px', textAlign: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(0,229,160,0.12)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, animation: 'pulse 1.4s ease-in-out infinite' }}>
        <Check size={40} color="var(--accent)" />
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 8 }}>Signed in</p>
      <h1 className="font-playfair" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, marginBottom: 10 }}>
        Bula vinaka{name ? `, ${name}` : ''}!
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 30 }}>Welcome to Sigidrigi — taking you to the songs…</p>
      <button onClick={() => nav('/', { replace: true })}
        style={{ background: 'var(--accent)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 14, padding: '12px 30px', cursor: 'pointer' }}>
        Continue
      </button>
    </div>
  )
}
