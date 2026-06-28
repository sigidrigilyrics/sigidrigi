# Google Play Store — listing & submission pack

Everything needed to publish **Sigidrigi** to the Play Store. Copy is ready to
paste; assets are in `docs/store-assets/`. Items marked **(YOU)** need you.

App ID: `app.sigidrigi.lyrics` · Privacy policy: https://sigidrigi.vercel.app/privacy

---

## Store listing text (paste into Play Console)

**App name** (30 char max)
```
Sigidrigi — Fijian Songbook
```

**Short description** (80 char max)
```
Fijian song lyrics with sing-along Sing Mode. Works offline. For home & abroad.
```

**Full description** (4000 char max)
```
Sigidrigi is a living archive of Fijian songs — the music of the kava mat, the
church, and the gathering. Browse the lyrics, learn the words, and sing along in
Sing Mode with lyrics that scroll as you go.

Made for Fiji and the diaspora in Australia, New Zealand and beyond, so the songs
of home are always in your pocket.

WHAT YOU GET
• A growing archive of Fijian sigidrigi lyrics — 199 songs and counting
• Sing Mode — full-screen, auto-scrolling lyrics that follow the beat, with a
  tap-to-start so the words land exactly when the singing begins
• Works offline — the whole catalogue is saved on your device, perfect for
  remote areas, island trips and long flights
• Search by song, artist or composer, and browse by category
• Save your favourites for one-tap singing
• Listen to a YouTube reference for any song to learn the melody
• A fresh set of free songs every week

MEMBERSHIP
Browse for free, and unlock the full archive with a simple monthly membership.
Your support keeps Fijian music alive and the archive growing.

Vinaka vakalevu for supporting our music.
```

**Category:** Music & Audio
**Tags:** music, lyrics, karaoke, Fiji, Pacific
**Contact email:** sigidrigilyrics@gmail.com
**Website:** https://sigidrigi.vercel.app

---

## Graphic assets

| Asset | Spec | Status |
|-------|------|--------|
| App icon | 512×512 PNG | ✅ `docs/store-assets/icon-512.png` |
| Feature graphic | 1024×500 PNG | ✅ `docs/store-assets/feature-graphic.png` |
| Phone screenshots | 2–8, min 1080px, 16:9 or 9:16 | **(YOU)** capture on your phone — see below |

**Screenshots to grab on your phone** (after the APK rebuild) — best sellers:
1. Home (hero + categories), 2. A song's lyrics, 3. Sing Mode mid-song,
4. Browse with the FREE badges, 5. Favorites. Just use the phone's screenshot
button; Play wants real device captures, not mockups.

---

## Build the release bundle (AAB)

Play requires a **signed Android App Bundle**, not the debug APK. One-time setup:

**1. Generate a signing keystore (YOU — pick a password and SAVE IT forever; if
it's lost you can never update the app):**
```
keytool -genkey -v -keystore sigidrigi-release.keystore -alias sigidrigi \
  -keyalg RSA -keysize 2048 -validity 10000
```
Keep `sigidrigi-release.keystore` somewhere safe and backed up (NOT in git).

**2. Tell Gradle about it** — create `android/key.properties` (git-ignored):
```
storeFile=../../sigidrigi-release.keystore
storePassword=<your password>
keyAlias=sigidrigi
keyPassword=<your password>
```
and add a `signingConfigs.release` block to `android/app/build.gradle` wired to
the `release` buildType. (I'll do this wiring with you when the keystore exists.)

**3. Build the bundle:**
```
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
npm run build ; npx cap sync android ; cd android ; .\gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Submission checklist (Play Console)
- [ ] **(YOU)** Create a Play Console account — one-time US$25 (play.google.com/console)
- [ ] Create app → name "Sigidrigi — Fijian Songbook", Music & Audio, free
- [ ] Paste short + full description (above)
- [ ] Upload icon (512), feature graphic (✅ ready), 2–8 phone screenshots
- [ ] Data safety form: collects email (account) — no sharing/selling
- [ ] Content rating questionnaire (Music app, no user-generated content = low rating)
- [ ] Privacy policy URL: https://sigidrigi.vercel.app/privacy
- [ ] Upload the signed `app-release.aab`
- [ ] Set up a Closed test track first (soft launch to diaspora testers), then Production
- [ ] Submit for review (typically a few days)

## What's ready vs. what needs you
- ✅ Ready now: all listing copy, app icon (512), feature graphic (1024×500), privacy policy, app metadata
- ⏳ Needs you: $25 account, keystore password, real phone screenshots (after APK rebuild)
- 🔧 We'll do together: wire the Gradle signing config once your keystore exists, build the AAB
