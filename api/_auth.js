import { createClient } from '@supabase/supabase-js'

export function setCors(res, req) {
  const origin = req.headers?.origin
  const allowed = new Set(['https://sigidrigi.vercel.app', 'https://sigidrigilyrics.com', 'capacitor://localhost', 'https://localhost'])
  if (origin && allowed.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export async function requireEditor(req) {
  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !url || !key) return null
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { data: { user } } = await client.auth.getUser(token)
  if (!user?.email) return null
  const { data: admin } = await client.from('admins').select('role').eq('email', user.email).maybeSingle()
  return admin?.role === 'admin' || admin?.role === 'editor' ? user : null
}

