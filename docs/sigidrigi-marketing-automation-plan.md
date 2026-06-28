# Sigidrigi Songbook — Digital Marketing Automation Plan
> Research-based plan for Facebook, WhatsApp, Instagram & TikTok

---

## OVERVIEW

| Platform | Priority | Automation Level | Cost |
|---|---|---|---|
| Facebook | 🔴 First | High — auto-reply, DM, scheduling | Free (native) |
| WhatsApp | 🔴 First | Medium — fix broadcasts | Free up to 1,000/mo |
| Instagram | 🟡 Second | Medium — lyric cards, reels | Free |
| TikTok | 🟢 Later | Low — need business account first | Free |

---

## 1. FACEBOOK AUTOMATION

### What's possible natively (free, no tools needed)

**Step 1 — Set up Instant Reply**
When someone DMs your page for the first time:
```
Meta Business Suite → Inbox → Automations → Instant Reply

Message:
"Bula! 🎵 Vinaka for reaching out to Sigidrigi Songbook.

To subscribe for full access to 1,500+ songs:
1. Send $5 FJD to MPaisa [your number]
2. Use reference: SGD-[your name]
3. Reply here with your receipt

Link to the app: sigidrigi.vercel.app

We'll activate your account within 24 hours. Vinaka! 🌺"
```

**Step 2 — Set up FAQ Auto-Replies**
```
Meta Business Suite → Inbox → Automations → Frequently Asked Questions

Add these FAQs:
Q: "How do I subscribe?"
A: "Subscribe for $5 FJD/month via MPaisa, MyCash, PayPal or bank transfer.
   Send payment to [your number] with reference SGD-[yourname]
   Then message us your receipt and we'll activate within 24hrs 🎵"

Q: "What is the app link?"
A: "Here's the link: sigidrigi.vercel.app
   50 free songs available — no login needed! 🌺"

Q: "How much does it cost?"
A: "$5 FJD per month — less than a bowl of grog 😄
   Unlock 1,500+ Sigidrigi songs + Sing Mode.
   sigidrigi.vercel.app"
```

**Step 3 — Comment-to-DM Keyword Triggers**
When someone comments "LINK", "SUBSCRIBE", "HOW", "PRICE" on any post:
```
Meta Business Suite → Inbox → Automations → Custom Keywords

Keywords: LINK, SUBSCRIBE, HOW, PRICE, APP, SONG

Auto-DM sent:
"Bula! 🎵 Here's the app link: sigidrigi.vercel.app

50 free songs available right now — no payment needed.
Full access (1,500+ songs) is just $5 FJD/month.

MPaisa · MyCash · PayPal · Bank Transfer

Message us to subscribe! Vinaka 🌺"
```

**Step 4 — Away Message (outside hours)**
```
"Bula! We're away right now but will get back to you soon.
In the meantime you can browse 50 free songs at:
sigidrigi.vercel.app 🎵"
```

### Post Scheduling (Free with Meta Business Suite)
```
Meta Business Suite → Posts → Create Post → Schedule

Weekly posting plan:
- Monday:    New song highlight — lyrics snippet + image
- Wednesday: "Did you know?" — Sigidrigi history fact
- Friday:    "Song of the week" — full post with subscribe CTA
- Sunday:    Community post — tanoa/jam session vibe
```

---

## 2. WHATSAPP AUTOMATION

### The Problem With Your Current Setup
Regular WhatsApp Business broadcasts are limited to 256 contacts at a time and cannot be automated. That's why it's not working at scale.

### The Fix — WhatsApp Business API via AiSensy (Free)

**Why AiSensy:**
- Free WhatsApp Business API access (no platform fee)
- You only pay Meta's message fees
- First 1,000 customer-initiated conversations/month FREE
- Works with your existing Meta Business account

**Setup Steps:**
```
1. Go to aisensy.com → Sign up free
2. Connect your Meta Business Manager account
3. Get a dedicated WhatsApp number (or migrate your existing one)
4. Apply for WhatsApp Business API — approved in ~10 minutes
5. Set up message templates (must be approved by Meta first)
```

**Message Templates to Create:**
```
Template 1: WELCOME (when someone subscribes)
"Bula [name]! 🎵 Welcome to Sigidrigi Songbook.

Your account is now active until [expiry_date].

Open the app: sigidrigi.vercel.app
Your 1,500+ songs are waiting 🌺

Vinaka vakalevu for supporting this archive!"

Template 2: EXPIRY REMINDER (7 days before)
"Bula [name]! 🎵 Your Sigidrigi subscription expires on [date].

Renew for $5 FJD to keep singing:
MPaisa · MyCash · PayPal · Bank Transfer

Reply here to renew. Vinaka! 🌺"

Template 3: NEW SONGS ADDED
"🎵 New songs added to Sigidrigi Songbook!

[Song 1], [Song 2], [Song 3] are now in the archive.

Search them now: sigidrigi.vercel.app

Share this with someone who'd love it 🌺"
```

**Cost Reality:**
- Customer replies to you → FREE (service window)
- You broadcast to subscribers → ~$0.025 USD per message
- 100 subscribers × renewal reminder = ~$2.50 USD/month
- Very affordable at your scale

---

## 3. INSTAGRAM AUTOMATION

### Setup
Connect Instagram Business account to Meta Business Suite (same account as Facebook)

### Auto-DM on Comments
Same keyword triggers as Facebook — works across both platforms from one setup in Meta Business Suite.

### Content Strategy
```
Post types for Instagram:

1. Lyric Card Posts
   - Black background + accent green text
   - Song title in Playfair Display font
   - 2-3 lines of lyrics
   - "Full lyrics at sigidrigi.vercel.app" caption
   Tool: Canva (free) — create a template once, reuse for every song

2. Reels (most reach)
   - 15-30 second video
   - Lyrics scrolling on screen (screenshot Sing Mode)
   - Audio: the YouTube instrumental track playing
   - Caption: "Sing along at sigidrigi.vercel.app 🎵"

3. Stories
   - "Swipe up" or link sticker to app
   - Poll: "Do you know this song?" 
   - Quiz: "Finish this lyric..."
```

### Canva Lyric Card Template
```
Design specs for Instagram:
- Size: 1080 × 1080px (square post)
- Background: #0A0A0A (your app dark background)
- Title font: Playfair Display Bold — #00E5A0 (accent green)
- Lyrics font: Inter Regular — #FFFFFF
- Footer: "sigidrigi.vercel.app" — small, white, bottom center
- Logo: top left corner

Create once in Canva → duplicate for every new song
```

---

## 4. THE NEW SONG → AUTO POST WORKFLOW

Every time you add a song to the app, this chain fires:

```
New song saved in Supabase
        ↓
Supabase webhook triggers
        ↓
┌──────────────────────────────────┐
│  Auto-generate post content:     │
│  Title + first verse + app link  │
└──────────────────────────────────┘
        ↓
┌─────────────┬──────────────┬─────────────────┐
│  Facebook   │  WhatsApp    │  Instagram      │
│  Post       │  Broadcast   │  (manual Canva) │
│  scheduled  │  to members  │  from template  │
└─────────────┴──────────────┴─────────────────┘
```

**Supabase Webhook → Facebook Post (via Make.com)**
```
1. Sign up at make.com (free — 1,000 operations/month)
2. Create scenario:
   Trigger: Supabase → Watch Rows (songs table, new rows)
   Action: Facebook Pages → Create Post

Post template:
"🎵 New song added: [title]

[first 2 lines of lyrics]...

Find the full lyrics and sing along at sigidrigi.vercel.app

#Sigidrigi #FijianMusic #SigidrigigLyrics"
```

---

## 5. TIKTOK (SET UP LATER)

**What you need first:**
1. Create TikTok Business account at business.tiktok.com
2. Link to your existing content

**Content strategy when ready:**
- Screen record Sing Mode with music playing
- Add captions: "POV: tanoa session and you forgot the words 😂"
- Fijian community on TikTok is active — diaspora audience perfect fit
- Post 3× per week for algorithm traction

---

## 6. TOOLS SUMMARY

| Tool | Purpose | Cost |
|---|---|---|
| Meta Business Suite | Facebook + Instagram scheduling, auto-replies | FREE |
| AiSensy | WhatsApp Business API + broadcasts | FREE (pay Meta per message ~$0.025) |
| Make.com | New song → auto Facebook post | FREE (1,000 ops/month) |
| Canva | Lyric card image templates | FREE |
| TikTok Business | Video content (later) | FREE |

**Total monthly cost at launch: ~$2-5 USD** (WhatsApp messages only)

---

## 7. SETUP ORDER

```
Week 1 — Facebook (do this first, biggest audience)
  ✅ Set up Instant Reply
  ✅ Set up FAQ auto-replies
  ✅ Set up keyword → DM triggers
  ✅ Set up away message
  ✅ Schedule first 4 posts

Week 2 — WhatsApp
  ✅ Sign up AiSensy
  ✅ Connect Meta Business account
  ✅ Create and submit message templates for approval
  ✅ Import existing contacts
  ✅ Test broadcast to small group first

Week 3 — Instagram
  ✅ Connect Instagram to Meta Business Suite
  ✅ Create Canva lyric card template
  ✅ Create first 5 lyric card posts
  ✅ Set up keyword auto-DM (same as Facebook)

Week 4 — New Song Automation
  ✅ Sign up Make.com
  ✅ Connect Supabase + Facebook
  ✅ Test new song → auto post workflow

Later — TikTok
  📌 Create TikTok Business account
  📌 Post first video
  📌 Build posting rhythm
```

---

## 8. LAUNCH POST SEQUENCE

When you go live, post in this order:

```
Day 1:  Facebook — the big launch post (already written ✅)
Day 2:  WhatsApp broadcast to existing contacts
Day 3:  Instagram — first lyric card post
Day 5:  Facebook — "behind the scenes" — photo of the physical notebooks
Day 7:  Facebook — first subscriber milestone post ("X people already joined!")
Day 10: WhatsApp — reminder to anyone who hasn't subscribed yet
Day 14: Facebook — "Song of the fortnight" feature post
```
