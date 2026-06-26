# Sigidrigi — Project Handoff / Context

> If you're a fresh Claude Code session: read this top to bottom to get up to speed,
> then continue the work. The immediate task is the **iOS build** (see bottom).

## What this is
A Fijian **Sigidrigi** songbook app — preserves Fijian song lyrics for the community at
home and across the diaspora (NZ, Australia, USA). Mobile-first. The signature feature is
**Sing Mode**: full-screen lyrics that auto-scroll, locked to a hidden YouTube instrumental.

## Stack
- React 18 + Vite + Tailwind + React Router v7
- Supabase (DB + auth + storage) — project ref `toofjmxrvdlhnpnxcpgm`
- Capacitor 8 — Android (`android/`) + iOS (`ios/`) native wrappers
- Hosting: Vercel → https://sigidrigi.vercel.app · GitHub: `sigidrigilyrics/sigidrigi`
- Design: dark `#0A0A0A`, accent teal `#00E5A0`, gold `#FFB800`, Playfair Display + Inter, max-width 480px

## .env.local (NOT in git — must be created)
Create a file `.env.local` in the project root with these two lines (the anon key is a
public, RLS-protected Supabase key — safe on the client):
```
VITE_SUPABASE_URL=https://toofjmxrvdlhnpnxcpgm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb2ZqbXhydmRsaG5wbnhjcGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjY3NzMsImV4cCI6MjA5NzcwMjc3M30.qsaZpCbnn8EOkAYZVgDXWqN0TnfAFqkbOT-3vfFXvwk
```

## Current state — 199 songs live
**Pages** (`src/pages/`): Home, Song, SingMode, AZIndex, Artists, Account, Admin, Upload,
Legal (serves /terms, /privacy, /copyright).
**Key libs** (`src/lib/`):
- `supabase.js` — client + `isConfigured`
- `songs.js` — cache-first catalog load (offline mode): `loadCatalog`, `loadSong`, `findCachedSong`
- `favorites.js` — localStorage favorites + `useFavorites` hook
- `youtube.js` — `getYouTubeId`, `loadYouTubeAPI` for the Sing Mode instrumental player

**Features built:** offline mode (whole catalog cached, works with no connection); favorites
(♥, localStorage); share button; "Find on YouTube" on every song; Android hardware back-button
fixed; full-screen immersive Sing Mode with auto-hiding controls; legal pages (contact
`sigidrigilyrics@gmail.com`); camera→cloud songbook digitisation.

**Audio model (Sing Mode priority):** `instrumental_url` (hidden YouTube backing track, primary)
→ `audio_url` (single MP3 fallback) → BPM-only auto-scroll. The old "Full Instrumental" dual-MP3
track was removed.

**Two YouTube fields per song:**
- `reference_url` = VISIBLE "Listen to reference / Find on YouTube" button = the artist's real video.
- `instrumental_url` = HIDDEN YouTube backing track played in Sing Mode (the user's own instrumentals).

**Admin:** password `sigidrigi2025`. Song CRUD + camera button → OCR upload page. Form fields
include both `reference_url` and `instrumental_url`.

## Build commands
**Android** (needs JDK 21 — Android Studio's bundled JBR is broken, build via gradlew CLI):
```
JAVA_HOME=<JDK 21>  ANDROID_HOME=<sdk>
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
**iOS:** `bash scripts/ios-setup.sh` (npm install → build → cap sync ios → cap open ios), then Xcode.

## Content pipeline (`scripts/`)
- `parse_pdf.py` + `insert_songs.py` — bulk-load songbook PDFs (Python urllib, dedup by normalized title)
- Photo OCR: the Upload page uploads page photos to Supabase Storage `instrumentals` bucket
  under `pages/` → Claude lists/downloads them, transcribes Fijian by hand (high accuracy),
  bulk-inserts, then deletes the processed photos.
- Instrumentals at scale: user uploads to a YouTube **playlist** named after songs → use
  `yt-dlp --flat-playlist --print "%(id)s|%(title)s"` to list, match to songs by title,
  bulk-PATCH `instrumental_url`.

## Launch plan (what's next, after iOS)
1. **Full content** to ~1,500 songs (photograph songbooks → transcribe; instrumentals → YouTube playlist).
2. **Free/rotation model** — 50 random free per visit, rest members-only ($5 FJD/mo). Coupled with…
3. **Subscription system** — manual payments (MPaisa/MyCash/PayPal/bank), admin "activate" button,
   30-day expiry, reminders. See `docs/sigidrigi-MASTER-build.md` Phases 3 & 5.
4. **Landing page** at sigidrigilyrics.com — see MASTER doc Phase 7.
- Legal pages: DONE. Licensing path: FPRA (fpra.com.fj) in Suva — deferred.

## Reference docs in this repo
- `docs/sigidrigi-MASTER-build.md` — full 9-phase build spec (the north star)
- `docs/sigidrigi-marketing-automation-plan.md` — FB/WhatsApp/IG/Make.com automation (post-launch)
- `docs/sigidrigi-legal-pages.md` — legal copy (already implemented in `src/pages/Legal.jsx`)

---

## ⏭️ IMMEDIATE TASK: build the iOS app (user is on a Mac, new to Mac)
The `ios/` project is already scaffolded (Capacitor, Swift Package Manager — **no CocoaPods**).
App icon is set. `appId` = `app.sigidrigi.lyrics`. Steps:
1. Confirm **Xcode** (App Store, ~7GB) and **Node** are installed; guide the install if not.
2. Ensure `.env.local` exists (see above).
3. `npm install` → `npm run build` → `npx cap sync ios` → `npx cap open ios`.
4. In Xcode: App target → Signing & Capabilities → "Automatically manage signing" → select a
   Team (a **free Apple ID** works for the simulator and the user's own iPhone — 7-day expiry).
5. Pick an iPhone simulator → Run. Help debug any Xcode errors.
The user is new to macOS — go one command at a time and explain each step plainly.
