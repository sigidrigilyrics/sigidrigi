import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'

export default function SubscribeSheet({ onClose }) {
  const [tier, setTier] = useState('member')
  const [method, setMethod] = useState('MPaisa')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const prices = { member: 5, performer: 15 }
  const methods = ['MPaisa', 'MyCash', 'PayPal', 'Bank']

  async function handleSubscribe() {
    if (!isConfigured) { setDone(true); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('members').upsert({
        id: user.id,
        email: user.email,
        payment_method: method,
        status: 'pending',
        subscribed_at: new Date().toISOString(),
      })
    }
    setDone(true)
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#141414', borderRadius: '28px 28px 0 0',
        padding: '12px 20px 40px'
      }}>
        {/* Grabber */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <span style={{ background: 'rgba(255,184,0,0.15)', color: 'var(--gold)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 999, display: 'inline-block', marginBottom: 10 }}>
              UNLOCK THE ARCHIVE
            </span>
            <h2 className="font-playfair" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Choose your plan</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>Cancel anytime · growing Fijian archive</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: 'var(--accent)', fontSize: 40, marginBottom: 12 }}>✓</div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Request received!</p>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>We'll send you the {method} payment details and unlock your account once it's confirmed.</p>
          </div>
        ) : (
          <>
            {/* Tier cards */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {[
                { id: 'member', price: '$5/mo', name: 'Member', desc: 'Full archive + instrumentals', badge: null },
                { id: 'performer', price: '$15/mo', name: 'Performer', desc: 'Everything + Sing Mode sync', badge: 'BPM + SETLISTS' },
              ].map(t => (
                <button key={t.id} onClick={() => setTier(t.id)}
                  style={{
                    flex: 1, background: tier === t.id ? 'rgba(0,229,160,0.08)' : 'var(--bg2)',
                    border: tier === t.id ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                    borderRadius: 14, padding: '14px 12px', cursor: 'pointer', textAlign: 'left'
                  }}>
                  {t.badge && (
                    <span style={{ background: 'rgba(255,184,0,0.15)', color: 'var(--gold)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 7px', borderRadius: 999, display: 'inline-block', marginBottom: 8 }}>{t.badge}</span>
                  )}
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{t.name} <span style={{ color: tier === t.id ? 'var(--accent)' : 'var(--text2)', fontWeight: 500, fontSize: 13 }}>{t.price}</span></div>
                  <div style={{ color: 'var(--text2)', fontSize: 12 }}>{t.desc}</div>
                </button>
              ))}
            </div>

            {/* Payment methods */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {methods.map(m => (
                <button key={m} onClick={() => setMethod(m)}
                  style={{
                    flex: 1, background: method === m ? 'rgba(0,229,160,0.1)' : 'var(--bg2)',
                    border: method === m ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                    borderRadius: 999, padding: '8px 4px', fontSize: 11, fontWeight: 600,
                    color: method === m ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer'
                  }}>{m}</button>
              ))}
            </div>

            <button onClick={handleSubscribe} disabled={loading}
              style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', border: 'none', borderRadius: 14, color: '#000', fontWeight: 700, fontSize: 15, padding: '15px', cursor: 'pointer', boxShadow: '0 8px 22px rgba(0,229,160,0.3)', marginBottom: 12 }}>
              {loading ? 'Submitting…' : `Request membership — $${prices[tier]}/mo`}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>Payments are confirmed manually during early access — we'll send {method} details after you request.</p>
          </>
        )}
      </div>
    </div>
  )
}
