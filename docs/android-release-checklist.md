# Android release checklist

## Build and signing

Both Android workflows use `npm run build:android`. The tracked `.env.android`
contains the same public Supabase URL and anonymous client key as the live website,
so the APK loads the existing catalogue. These are public client settings, not a
service-role credential. Android builds fail if those settings are empty.
The debug workflow always selects Google's test rewarded unit; only the release
workflow reads `ADMOB_REWARDED_ID`.

- [ ] Run the `Android build` GitHub Actions workflow and download the debug APK artifact.
- [ ] In GitHub repository **Settings → Secrets and variables → Actions**, add `ADMOB_REWARDED_ID` with the production rewarded unit ID for release builds.
- [ ] Run **Actions → Android build → Run workflow** on `master`; the workflow uses test ads and uploads `app-debug.apk` as an artifact.
- [ ] Install the debug APK on at least one Android 8+ device and test login, song loading, Sing Mode, back navigation, and offline cached songs.
- [ ] Create a release keystore outside the repository and store its values in GitHub Actions secrets.
- [ ] Add `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` as GitHub Actions secrets, then run the `Android release bundle` workflow to produce a signed `.aab`.
- [ ] Keep `compileSdkVersion` and `targetSdkVersion` at 36 unless Play requirements require a newer version.

## Rewarded ads

- [ ] Create the AdMob Android app and rewarded ad unit.
- [ ] Register the native provider through `configureRewardedAdProvider`.
- [ ] Use Google test ad IDs on development devices.
- [ ] Confirm close-before-reward leaves the song locked and duplicate reward callbacks are idempotent.
- [ ] Replace localStorage entitlement with a Supabase Edge Function and short-lived `ad_unlocks` records before production.
- [ ] Complete Play Console ads declaration and Data safety form.

## Payments and access

- [ ] Confirm Supabase RLS allows users to create only their own pending membership request.
- [ ] Confirm only admins can activate, renew, or expire memberships.
- [ ] Verify every payment method and annual PayPal details in `app_settings`.
- [ ] Test expired membership, pending membership, active membership, and ad-unlocked songs independently.

## Store submission

- [ ] Set the final application icon, screenshots, privacy policy URL, and support email.
- [ ] Complete Play Console content rating, target audience, app access, and privacy declarations.
- [ ] Upload the signed AAB to internal testing first.
- [ ] Test the production-like build with real Supabase configuration before staged rollout.

## USB device test

- [ ] On the phone, enable **Developer options → USB debugging**, unlock it, select **File transfer** when prompted, and accept the computer's RSA key.
- [ ] From the project, run `adb devices -l` and wait for a device state of `device` (not `unauthorized`).
- [ ] Install the downloaded artifact with `adb install -r app-debug.apk`, then collect failures with `adb logcat`.
