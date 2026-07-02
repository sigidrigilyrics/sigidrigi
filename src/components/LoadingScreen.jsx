import { useState, useEffect } from 'react'

// Full-screen "Loading…" that, if it lingers past ~6s, reveals a Retry/Back escape
// hatch so a slow or wedged load never looks like a permanently frozen app.
export default function LoadingScreen({ onBack, background = 'transparent' }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background, color: 'var(--text2)', padding: '0 32px', textAlign: 'center', gap: 14 }}>
      {!slow ? (
        <span>Loading…</span>
      ) : (
        <>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Taking longer than expected</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: -6 }}>Check your connection and try again.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={() => window.location.reload()}
              style={{ background: 'var(--accent)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 14, padding: '11px 26px', cursor: 'pointer' }}>
              Retry
            </button>
            {onBack && (
              <button onClick={onBack}
                style={{ background: 'var(--bg2)', border: 'none', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 14, padding: '11px 26px', cursor: 'pointer' }}>
                Go back
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
