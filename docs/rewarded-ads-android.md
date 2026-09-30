# Rewarded unlock: Android handoff

The web app now has the product contract and UI for an opt-in unlock:

- a guest may unlock up to three distinct songs per UTC day;
- the button never grants an unlock before `watchRewardedAd()` resolves successfully;
- membership and the weekly free rotation continue to work;
- Sing Mode checks the same entitlement as the song page.

The web/demo provider intentionally throws `Rewarded ads are not connected yet.` This keeps local builds honest and prevents a browser button from pretending that an ad was watched.

`src/lib/nativeAdMob.js` now registers the native bridge when Capacitor runs on a
device. It uses Google's Android test rewarded unit unless `VITE_ADMOB_REWARDED_ID`
is configured, and it only grants the client-side temporary entitlement after the
native reward promise reports a positive reward.

## Android integration

1. Create an AdMob app and Android rewarded ad unit. Keep the app ID and ad unit ID out of GitHub; use the Android manifest/build configuration or the project's secure environment setup.
2. The project already includes the compatible `@capacitor-community/admob` v8 package. It targets Capacitor 8 and exposes `prepareRewardVideoAd` followed by `showRewardVideoAd`; do not add a second Google Mobile Ads SDK dependency.
3. Implement the provider in `src/lib/adUnlock.js` or a native bridge so it:
   - calls `AdMob.prepareRewardVideoAd({ adId, ssv: { customData } })`;
   - calls `AdMob.showRewardVideoAd()` only after the user taps the explicit unlock button;
   - resolves `true` only from the SDK promise/reward callback;
   - rejects on close-before-reward, load error, timeout or unavailable inventory.
4. In production, move the entitlement decision server-side. The client should send a signed reward/nonce to a Supabase Edge Function, which validates the event and writes a short-lived `ad_unlocks` record. Do not treat localStorage as proof of a reward.
5. Return an entitlement expiry and song ID from the server. Enforce it when serving restricted lyrics and when entering Sing Mode.
6. Use Google's test ad unit IDs on development devices. Never click live ads while testing.
7. Declare ads in Play Console and include the required privacy/data-safety disclosures. Rewarded ads must remain explicitly opt-in and must not interrupt playback or appear unexpectedly.

## Acceptance tests

- No ad available: the song remains locked and the user sees a retry message.
- User closes before completion: no unlock is written.
- Reward callback: exactly one unlock is written; repeat callbacks are idempotent.
- Three songs unlocked: the fourth unlock is refused until the UTC day changes.
- Different account/device: the server entitlement, not local browser state, controls access.
- Membership: members never need to watch an ad.
- Sing Mode: the unlocked song opens; a different locked song remains locked.
- Offline: existing cached membership/free content follows its defined offline policy; no new ad unlock is fabricated offline.
