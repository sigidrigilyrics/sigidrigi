import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'

// On the native Android app the OAuth round-trip can't redirect back to an https
// page — it returns to the app via this custom-scheme deep link, which the
// appUrlOpen listener in App.jsx catches and exchanges for a session.
export const NATIVE_OAUTH_REDIRECT = 'app.sigidrigi.lyrics://login-callback'

export async function signInWithGoogle() {
  const native = Capacitor.isNativePlatform()
  const redirectTo = native ? NATIVE_OAUTH_REDIRECT : window.location.origin

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: native },
  })
  if (error) throw error

  // Web: supabase has already navigated the page to Google.
  // Native: open Google in the system browser; the deep link brings us back.
  if (native && data?.url) {
    await Browser.open({ url: data.url })
  }
}
