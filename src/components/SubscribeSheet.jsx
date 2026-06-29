import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { generateReferenceCode, loadPaymentDetails, MEMBERSHIP_PRICE } from '../lib/membership'

export default function SubscribeSheet({ onClose }) {
  const [method, setMethod] = useState('MPaisa')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [refCode, setRefCode] = useState('')
  const [paymentDetails, setPaymentDetails] = useState({})

  const methods = ['MPaisa', 'MyCash', 'PayPal', 'Bank']

  useEffect(() => {
    loadPaymentDetails().then(setPaymentDetails)
  }, [])

  async function handleSubscribe() {
    setLoading(true)
    let email = ''
    let userId = null
    if (isConfigured) {
      const { data: { user } } = await supabase.auth.getUser()
      email = user?.email || ''
      userId = user?.id || null
    }
    const code = generateReferenceCode(email)
    setRefCode(code)
    if (userId) {
      await supabase.from('members').upsert({
        id: userId,
        email,
        payment_method: method,
        amount_paid: MEMBERSHIP_PRICE,
        reference_code: code,
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
              {done ? 'PAYMENT DETAILS' : 'UNLOCK THE ARCHIVE'}
            </span>
            <h2 className="font-playfair" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{done ? 'Almost there!' : 'Become a member'}</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>{done ? 'Send your payment, then message us the receipt' : 'Cancel anytime · growing Fijian archive'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {done ? (
          <>
            {/* Reference code */}
            <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: '12px 14px', marginBottom: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Your reference code</p>
              <p className="font-playfair" style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.04em' }}>{refCode}</p>
            </div>

            {/* Payment instructions */}
            <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 12, padding: '14px', marginBottom: 16 }}>
              {method === 'PayPal' ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 10 }}>
                    Pay <strong>$5 USD</strong> via PayPal. Add your reference code in the notes so we can identify your payment.
                  </p>
                  <a
                    href={paymentDetails['PayPal'] || '#'}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#0070ba', color: '#fff', fontWeight: 700, fontSize: 14, padding: '11px', borderRadius: 10, textDecoration: 'none', marginBottom: 8 }}>
                    Pay with PayPal — add "{refCode}" in notes
                  </a>
                </>
              ) : method === 'Bank' ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 10 }}>
                    Send <strong>${MEMBERSHIP_PRICE} FJD</strong> via <strong>ANZ Bank Transfer</strong>. Message us on WhatsApp with your reference code and we'll send you the account details privately.
                  </p>
                  <a
                    href={`https://wa.me/6792440483?text=Hi%20Sigidrigi!%20I%20want%20to%20subscribe.%20My%20reference%20code%20is%20${refCode}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25d366', color: '#fff', fontWeight: 700, fontSize: 14, padding: '11px', borderRadius: 10, textDecoration: 'none', marginBottom: 8 }}>
                    WhatsApp us — {refCode}
                  </a>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
                    Send <strong>${MEMBERSHIP_PRICE} FJD</strong> via <strong>{method}</strong> to:
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', margin: '6px 0' }}>{paymentDetails[method] || 'Loading…'}</p>
                  <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6 }}>
                    Quote reference <strong>{refCode}</strong>, then message your receipt to <strong>sigidrigilyrics@gmail.com</strong>. We'll activate your account within 24 hours.
                  </p>
                </>
              )}
            </div>

            <button onClick={onClose}
              style={{ width: '100%', background: 'var(--bg2)', border: 'none', borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: 14, padding: '13px', cursor: 'pointer' }}>
              Done
            </button>
          </>
        ) : (
          <>
            {/* Single membership */}
            <div style={{ background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--accent)', borderRadius: 14, padding: '16px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 18 }}>Membership</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>${MEMBERSHIP_PRICE} FJD/mo</span>
              </div>
              <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>Full access to the whole archive + Sing Mode with backing tracks. Cancel anytime.</p>
            </div>

            {/* Payment method */}
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Pay with</p>
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
              {loading ? 'Submitting…' : `Get membership — $${MEMBERSHIP_PRICE}/mo`}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>Payments are confirmed manually during early access. You'll get a reference code + payment details next.</p>
          </>
        )}
      </div>
    </div>
  )
}
