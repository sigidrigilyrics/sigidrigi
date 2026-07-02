import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isConfigured = /^https?:\/\/.{10}/.test(rawUrl) && rawKey.length > 20

// Wrap fetch with an AbortController timeout so a stalled connection (opened but
// no response) rejects instead of hanging forever — callers then fall back to the
// cached catalogue / degrade gracefully instead of the UI freezing. Requests that
// already carry a signal (e.g. supabase's own auth token refresh) are left alone.
function fetchWithTimeout(input, init = {}, ms = 8000) {
  if (init.signal) return fetch(input, init)
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id))
}

// PKCE flow so OAuth works on both web (auto-exchange via detectSessionInUrl)
// and the native app (manual exchangeCodeForSession from the deep-link callback).
const authOptions = {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  global: { fetch: (input, init) => fetchWithTimeout(input, init, 8000) },
}

// Only call createClient with a real URL — never with placeholder text
export const supabase = isConfigured
  ? createClient(rawUrl, rawKey, authOptions)
  : createClient('https://xyzcompany.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.demo-placeholder-not-real', authOptions)
