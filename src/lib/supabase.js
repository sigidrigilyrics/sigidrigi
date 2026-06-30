import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isConfigured = /^https?:\/\/.{10}/.test(rawUrl) && rawKey.length > 20

// PKCE flow so OAuth works on both web (auto-exchange via detectSessionInUrl)
// and the native app (manual exchangeCodeForSession from the deep-link callback).
const authOptions = {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
}

// Only call createClient with a real URL — never with placeholder text
export const supabase = isConfigured
  ? createClient(rawUrl, rawKey, authOptions)
  : createClient('https://xyzcompany.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.demo-placeholder-not-real', authOptions)
