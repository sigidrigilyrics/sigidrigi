import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { FREE_PER_WEEK } from '../lib/membership'

const CONTACT = 'sigidrigilyrics@gmail.com'
const SITE = 'sigidrigi.vercel.app'
const UPDATED = 'June 2026'

// Section content for each legal page. { h } = heading, { p } = paragraph, { li } = bullet list.
const PAGES = {
  copyright: {
    title: 'Copyright',
    sections: [
      { p: 'All lyrics featured on the Sigidrigi Songbook remain the property of their original composers, artists, and rights holders. Sigidrigi Songbook is an independent cultural preservation platform — we do not claim ownership of any lyrics, melodies, or musical compositions featured here.' },
      { p: 'Sigidrigi music represents the living cultural heritage of the Fijian people. Many of these songs are traditional works passed down through generations, with no known individual copyright holder. Where composers are known, we credit them accordingly.' },
      { p: 'This platform exists to ensure these songs are not lost — preserving them in digital form for Fijians at home and across the diaspora in New Zealand, Australia, the United States, and beyond.' },
      { p: `If you are a rights holder and believe your work has been featured without proper authorisation, or if you wish to be credited differently, please contact us at ${CONTACT} and we will respond promptly.` },
      { p: '© 2026 Sigidrigi Songbook. Platform design, curation, and all original content rights reserved.' },
    ],
  },
  terms: {
    title: 'Terms of Use',
    sections: [
      { p: `Last updated: ${UPDATED}` },
      { p: 'Welcome to Sigidrigi Songbook ("the Platform"). By accessing or using this platform, you agree to the following terms.' },
      { h: '1. What We Are' },
      { p: 'Sigidrigi Songbook is a digital archive and cultural preservation platform for Fijian Sigidrigi lyrics. We are not a music label, publisher, or rights management organisation. We are a community-driven archive built to keep Fijian music accessible for current and future generations.' },
      { h: '2. Lyrics & Intellectual Property' },
      { li: [
        'All lyrics on this platform belong to their original composers and rights holders.',
        'Sigidrigi Songbook does not claim ownership of any song lyrics, melodies, or compositions.',
        'Lyrics are displayed for personal, non-commercial reference and cultural preservation purposes only.',
        'You may not reproduce, republish, or distribute lyrics from this platform for commercial purposes without the consent of the original rights holder.',
      ] },
      { h: '3. Subscriptions' },
      { li: [
        'A paid membership ($5 FJD/month) provides full access to the song archive and all platform features including Sing Mode.',
        `${FREE_PER_WEEK} songs are available free of charge on a rotating basis.`,
        'Subscriptions are billed monthly. You may cancel at any time.',
        'Payments are processed via MPaisa, MyCash, PayPal, or bank transfer.',
        'Refunds are handled on a case-by-case basis. Contact us within 7 days of payment if you have an issue.',
      ] },
      { h: '4. User Conduct' },
      { p: 'You agree not to:' },
      { li: [
        "Copy, scrape, or reproduce the platform's song archive in bulk.",
        'Share your account credentials with others.',
        'Use the platform for any unlawful purpose.',
      ] },
      { h: '5. Takedown Requests' },
      { p: `If you are a rights holder and believe a song on this platform infringes your copyright, contact us at ${CONTACT} with the song title and your claim. We will review and respond within 14 days.` },
      { h: '6. Limitation of Liability' },
      { p: 'Sigidrigi Songbook is provided "as is." We make no warranties about the accuracy of lyrics. We are not liable for any loss arising from the use of this platform.' },
      { h: '7. Changes to These Terms' },
      { p: 'We may update these terms at any time. Continued use of the platform after changes constitutes acceptance.' },
      { h: 'Contact' },
      { p: `${CONTACT} · ${SITE}` },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      { p: `Last updated: ${UPDATED}` },
      { h: 'What We Collect' },
      { li: [
        'Account information: email address and payment details when you subscribe.',
        'Usage data: pages visited, songs searched, and features used — to improve the platform.',
        'We do not sell your data to third parties.',
      ] },
      { h: 'How We Use It' },
      { li: [
        'To manage your subscription and access.',
        "To improve the platform and add songs you're searching for.",
        'To contact you about your account if needed.',
      ] },
      { h: 'Data Storage' },
      { p: 'Your data is stored securely using Supabase. We do not store payment card details — payments are handled by MPaisa, MyCash, or PayPal directly.' },
      { h: 'Your Rights' },
      { p: `You may request deletion of your account and personal data at any time by contacting us at ${CONTACT}.` },
      { h: 'Cookies' },
      { p: 'This platform uses minimal cookies for session management only. We do not use advertising cookies.' },
      { h: 'Contact' },
      { p: `${CONTACT} · ${SITE}` },
    ],
  },
}

export default function Legal({ type }) {
  const nav = useNavigate()
  const page = PAGES[type]
  if (!page) return null

  const others = Object.keys(PAGES).filter(k => k !== type)

  return (
    <div style={{ paddingBottom: 60, maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '52px 20px 16px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-playfair" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{page.title}</h1>
      </div>

      {/* Body */}
      <div style={{ padding: '4px 20px 0' }}>
        {page.sections.map((s, i) => {
          if (s.h) return <h2 key={i} className="font-playfair" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 22, marginBottom: 8 }}>{s.h}</h2>
          if (s.li) return (
            <ul key={i} style={{ margin: '0 0 6px', paddingLeft: 18 }}>
              {s.li.map((item, j) => (
                <li key={j} style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 6 }}>{item}</li>
              ))}
            </ul>
          )
          return <p key={i} style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{s.p}</p>
        })}

        {/* Footer — links to the other legal pages */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 28, paddingTop: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {others.map(k => (
            <button key={k} onClick={() => nav(`/${k}`)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              {PAGES[k].title}
            </button>
          ))}
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 16, lineHeight: 1.6 }}>
          © 2026 Sigidrigi Songbook · All lyrics belong to their original artists
        </p>
      </div>
    </div>
  )
}
