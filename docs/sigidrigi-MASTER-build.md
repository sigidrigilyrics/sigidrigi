# 🎵 SIGIDRIGI SONGBOOK — MASTER BUILD DOCUMENT
> Hand this entire file to Claude Code. Build in the order listed.
> Project: sigidrigilyrics.com · App: React + Vite + Supabase · Host: Vercel

---

# PROJECT CONTEXT

Sigidrigi Songbook is a mobile-first web app preserving Fijian Sigidrigi song lyrics for the community at home and across the diaspora (NZ, Australia, USA). 1,500+ songs digitised from physical handwritten notebooks.

**Existing stack:**
- Frontend: React + Vite
- Backend/DB: Supabase
- Hosting: Vercel
- Domain: sigidrigilyrics.com (pointing to Vercel)
- Design: Playfair Display titles, Inter UI, dark background (#0A0A0A), accent green (#00E5A0)

**Business model:**
- 50 free songs, randomised on each visit
- $5 FJD/month subscription for full access
- Payments: MPaisa, MyCash, PayPal, bank transfer (all manual confirmation)
- Goal: 300 subscribers = sustainable forever

---

# BUILD ORDER

```
PHASE 1 — Database & Schema
PHASE 2 — Authentication (Google OAuth + email)
PHASE 3 — Subscription system & tracking
PHASE 4 — Sing Mode YouTube player
PHASE 5 — Free songs randomisation
PHASE 6 — Lyrics upload automation (OCR + AI + CSV)
PHASE 7 — Landing page / marketing homepage
PHASE 8 — Legal pages
PHASE 9 — Domain + deploy
```

---

# PHASE 1 — DATABASE & SCHEMA

```sql
-- Songs table (likely exists — confirm these columns)
CREATE TABLE IF NOT EXISTS songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT DEFAULT 'Traditional',
  genre TEXT,
  lyrics TEXT NOT NULL,
  preview_lyrics TEXT,           -- first verse shown free
  source TEXT,                   -- e.g. "Book 1 p.3"
  youtube_url TEXT,              -- for Sing Mode music
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Members table — add subscription tracking columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS reference_code TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);
ALTER TABLE members ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS notes TEXT;

-- Enable Row Level Security
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Songs readable by everyone (free songs + previews)
CREATE POLICY "Songs are viewable by everyone"
  ON songs FOR SELECT USING (true);

-- Members can only see their own record
CREATE POLICY "Users can view own member record"
  ON members FOR SELECT USING (auth.uid() = id);
```

---

# PHASE 2 — AUTHENTICATION (Android-first)

> Primary: Google OAuth (one tap). Secondary: Email + Password.

### 2a. Google OAuth setup (Google Cloud Console)
```
1. console.cloud.google.com → New Project "Sigidrigi"
2. APIs & Services → OAuth consent screen → External → fill app name
3. Credentials → Create OAuth Client ID → Web Application
4. Authorised redirect URI:
   https://YOUR_SUPABASE_REF.supabase.co/auth/v1/callback
5. Copy Client ID + Secret
6. Supabase Dashboard → Auth → Providers → Google → paste + enable
```

### 2b. Login page
```javascript
// src/pages/Login.jsx
import { supabase } from '../lib/supabase'

export default function Login() {
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/account` }
    })
  }

  const loginWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
  }

  const signUpWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
  }

  return (
    <div className="login-page">
      <h1>Sigidrigi Songbook</h1>
      <p>Login to access 1,500+ songs</p>
      <button onClick={loginWithGoogle} className="btn-google">
        Continue with Google
      </button>
      <div className="divider">or</div>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button onClick={loginWithEmail}>Login</button>
      <button onClick={signUpWithEmail}>Create Account</button>
    </div>
  )
}
```

### 2c. Auth state listener in App.jsx
```javascript
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [user, setUser] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) checkSubscription(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) checkSubscription(session.user.id)
        else setIsSubscribed(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const checkSubscription = async (userId) => {
    const { data: member } = await supabase
      .from('members')
      .select('is_active, expires_at')
      .eq('id', userId)
      .single()

    if (!member) return setIsSubscribed(false)

    const isExpired = new Date(member.expires_at) < new Date()
    if (isExpired && member.is_active) {
      await supabase.from('members').update({ is_active: false }).eq('id', userId)
      return setIsSubscribed(false)
    }
    setIsSubscribed(member.is_active)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsSubscribed(false)
  }
  // pass user, isSubscribed, logout to routes
}
```

---

# PHASE 3 — SUBSCRIPTION SYSTEM

### 3a. Members table admin views
Build 4 filtered views in the Admin panel:
- **Pending** — signed up, payment not confirmed (is_active = false, paid_at = null)
- **Active** — is_active = true, expires_at > now
- **Expiring Soon** — expires_at within 7 days
- **Expired** — expires_at < now

### 3b. Activate subscription (Admin button)
```javascript
async function activateSubscription(memberId, paymentMethod, referenceCode, amountPaid) {
  const paidAt = new Date()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { error } = await supabase
    .from('members')
    .update({
      is_active: true,
      payment_method: paymentMethod,
      reference_code: referenceCode,
      amount_paid: amountPaid,
      paid_at: paidAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      reminder_sent: false
    })
    .eq('id', memberId)

  if (!error) await sendWelcomeEmail(memberId)
}
```

### 3c. Auto-expiry Edge Function (runs daily)
```typescript
// supabase/functions/check-subscriptions/index.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const today = new Date().toISOString()

  // Deactivate expired
  await supabase.from('members')
    .update({ is_active: false })
    .lt('expires_at', today).eq('is_active', true)

  // Find expiring in 7 days
  const sevenDays = new Date()
  sevenDays.setDate(sevenDays.getDate() + 7)

  const { data: expiringSoon } = await supabase.from('members')
    .select('email, expires_at')
    .lt('expires_at', sevenDays.toISOString())
    .gt('expires_at', today)
    .eq('is_active', true).eq('reminder_sent', false)

  for (const m of expiringSoon || []) {
    await sendReminderEmail(m.email, m.expires_at)
    await supabase.from('members').update({ reminder_sent: true }).eq('email', m.email)
  }

  return new Response(JSON.stringify({ checked: true }))
})

async function sendReminderEmail(email, expiresAt) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Sigidrigi Songbook <noreply@sigidrigilyrics.com>',
      to: email,
      subject: 'Your Sigidrigi subscription expires soon 🎵',
      html: `<p>Your subscription expires on ${new Date(expiresAt).toLocaleDateString()}. Renew for $5 FJD to keep singing. 🌺</p>`
    })
  })
}
```

### 3d. Schedule it
```sql
select cron.schedule(
  'check-subscriptions-daily',
  '0 12 * * *',  -- midnight Fiji time
  $$ select net.http_post(
    url := 'https://YOUR_REF.supabase.co/functions/v1/check-subscriptions',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) $$
);
```

### 3e. Subscribe page (payment instructions)
```javascript
// src/pages/Subscribe.jsx — generates reference code, shows payment options
function generateReferenceCode(userName) {
  const random = Math.floor(1000 + Math.random() * 9000)
  return `SGD-${userName.slice(0,3).toUpperCase()}-${random}`
}
// Show: MPaisa number, MyCash, PayPal, bank details
// User pays → messages receipt → admin activates
```

---

# PHASE 4 — SING MODE YOUTUBE PLAYER

```javascript
// src/components/YouTubePlayer.jsx
const getYouTubeId = (url) => {
  if (!url) return null
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/
  )
  return match ? match[1] : null
}

export default function YouTubePlayer({ youtubeUrl, isPlaying }) {
  const videoId = getYouTubeId(youtubeUrl)
  if (!videoId) return null

  return (
    <iframe
      style={{ display: 'none' }}
      src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&controls=0&loop=1&playlist=${videoId}`}
      allow="autoplay; encrypted-media"
      title="sing-mode-music"
    />
  )
}
```

In SingMode page:
```javascript
// Music autoplays when user taps "Enter Sing Mode" (counts as interaction)
<YouTubePlayer youtubeUrl={song.youtube_url} isPlaying={true} />
```

---

# PHASE 5 — FREE SONGS RANDOMISATION

> 50 free songs that rotate on each visit

```javascript
// src/utils/freeSongs.js
export async function getFreeSongs() {
  // Get all songs marked is_free, then randomly select 50
  const { data: allFree } = await supabase
    .from('songs')
    .select('*')
    .eq('is_free', true)

  // Shuffle and take 50
  const shuffled = allFree.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 50)
}

// Alternative: if you want ALL songs available free on rotation,
// pull 50 random from entire catalogue each visit:
export async function getRandomFreeSelection() {
  const { data } = await supabase.rpc('get_random_songs', { count: 50 })
  return data
}
```

```sql
-- Supabase function for random selection
CREATE OR REPLACE FUNCTION get_random_songs(count INT)
RETURNS SETOF songs AS $$
  SELECT * FROM songs ORDER BY random() LIMIT count;
$$ LANGUAGE sql;
```

---

# PHASE 6 — LYRICS UPLOAD AUTOMATION

### 6a. OCR from photo (Google Vision)
```javascript
// src/utils/ocrUpload.js
export async function extractLyricsFromPhoto(imageFile) {
  const base64 = await fileToBase64(imageFile)
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${import.meta.env.VITE_GOOGLE_VISION_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION' }] }]
      })
    }
  )
  const data = await response.json()
  const rawText = data.responses[0]?.fullTextAnnotation?.text || ''
  return cleanFijianLyrics(rawText)
}

function cleanFijianLyrics(text) {
  return text
    .replace(/[|\\]/g, 'I')
    .replace(/0(?=[a-z])/gi, 'O')
    .replace(/1(?=[a-z])/gi, 'l')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

### 6b. AI cleanup (Claude API)
```javascript
// src/utils/aiCleanup.js
export async function cleanupLyricsWithAI(rawLyrics, songTitle) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Digitise these Fijian Sigidrigi lyrics from OCR.
Title: ${songTitle}
Raw OCR: ${rawLyrics}

Fix OCR errors, correct Fijian spelling, format into verses, label sections (VERSE 1, CHORUS).
Keep all Fijian words, do not translate. Return ONLY cleaned lyrics.`
      }]
    })
  })
  const data = await response.json()
  return data.content[0]?.text || rawLyrics
}
```

### 6c. Bulk CSV import
```javascript
// src/utils/csvImport.js
import Papa from 'papaparse'

export async function importSongsFromCSV(csvFile) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvFile, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const songs = results.data.map(row => ({
          title: row.title?.trim(),
          artist: row.artist?.trim() || 'Traditional',
          genre: row.genre?.trim() || null,
          lyrics: row.lyrics?.trim(),
          source: row.source?.trim() || null,
          youtube_url: row.youtube_url?.trim() || null,
          is_free: row.is_free === 'true' || row.is_free === '1'
        }))
        const { data, error } = await supabase.from('songs').insert(songs)
        if (error) reject(error)
        else resolve({ inserted: songs.length })
      },
      error: reject
    })
  })
}
```

### 6d. Admin upload UI
Three tabs: `[📷 Photo OCR] [📄 CSV Import] [✏️ Manual Entry]`
Photo flow: upload → OCR → AI cleanup → review/edit → save
CSV flow: download template → upload → preview → confirm

---

# PHASE 7 — LANDING PAGE / MARKETING HOMEPAGE

> sigidrigilyrics.com homepage. Sells subscription, then leads into the app.
> Use the 5-step marketing structure: Model, Market, Message, Media, Machine.

### Sections (top to bottom):
```
1. HERO
   - Tapa texture background, #0A0A0A
   - Headline: "Sigidrigi Lyrics" (Playfair, accent green)
   - Subhead: "Never forget the words again. 1,500+ Fijian songs in your pocket."
   - [Try 50 Free Songs] [Subscribe — $5/mo]
   - Stats: 1,500+ Songs · 14k Followers · $5/month

2. THE STORY (preservation mission)
   - Photo of physical notebooks
   - "These songs live in handwritten books. We're saving them forever."
   - Cultural preservation framing

3. FEATURES
   - 🔍 Search any song instantly
   - 🎤 Sing Mode with music + scrolling lyrics
   - 📖 1,500+ verified songs
   - 🌍 Works anywhere — Fiji, NZ, Australia, USA

4. HOW SING MODE WORKS
   - Screenshot/demo of Sing Mode
   - "Music plays, lyrics scroll, you sing"

5. PRICING
   - Free: 50 rotating songs
   - Member: $5 FJD/month — everything
   - Payment icons: MPaisa, MyCash, PayPal, Bank

6. COMMUNITY
   - Tanoa/jam session imagery
   - "Built for the boys around the tanoa, families, and our diaspora"

7. CTA FOOTER
   - [Start Singing] button → app
   - Links: Terms, Privacy, Copyright
   - © 2026 Sigidrigi Songbook · All lyrics belong to their original artists
```

### Design tokens (match existing app)
```css
--bg: #0A0A0A;
--accent: #00E5A0;
--text: #FFFFFF;
/* Playfair Display for headings, Inter for body */
```

---

# PHASE 8 — LEGAL PAGES

Create 3 routes: `/terms`, `/privacy`, `/copyright`
(Full copy already written — see sigidrigi-legal-pages.md)

Footer on every page:
```
© 2026 Sigidrigi Songbook · All lyrics belong to their original artists · Terms · Privacy · Copyright
```

Key disclaimer for /copyright:
"All lyrics remain the property of their original composers and rights holders. This platform exists solely for cultural preservation. We do not claim ownership. Rights holders may contact us for removal or crediting."

---

# PHASE 9 — DOMAIN & DEPLOY

```
1. Buy sigidrigilyrics.com (Namecheap ~$12/year)
2. Vercel → Project → Settings → Domains → Add sigidrigilyrics.com
3. Paste Vercel's DNS records into Namecheap
4. Wait for SSL (up to 24hrs)
5. Test on Android device
6. Go live 🚀
```

---

# ENVIRONMENT VARIABLES
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_GOOGLE_VISION_KEY=
RESEND_API_KEY=
```

# SERVICES TO SIGN UP FOR
- [ ] Resend (resend.com) — emails, free
- [ ] Google Cloud Vision — OCR, free 1000/mo
- [ ] Google Cloud OAuth — login
- [ ] Namecheap — domain
- [ ] Digicel MPaisa Business — payment tracking (contact Digicel Fiji)

---

# MARKETING AUTOMATION (separate — do after app is live)
See sigidrigi-marketing-automation-plan.md for:
- Facebook auto-replies & keyword DM triggers
- WhatsApp Business API (AiSensy)
- Instagram lyric cards
- Make.com new-song → auto-post
- 5-day setup schedule (1 platform per day)
```
