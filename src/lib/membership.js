import { useState, useEffect, useCallback } from 'react'
import { supabase, isConfigured } from './supabase'
import { getCachedCatalog } from './songs'

// ── Master paywall flag ──────────────────────────────────────────────
// While false, EVERY song stays open (testing / content-loading phase).
// Flip to true at launch to turn on the members-only paywall.
export const LOCK_CONTENT = true

export const MEMBERSHIP_PRICE = 5 // FJD / month

// Payment details are stored in Supabase app_settings table (not in source code).
// Keys: payment_MPaisa, payment_MyCash, payment_Bank
export async function loadPaymentDetails() {
  try {
    const { data } = await supabase.from('app_settings').select('key,value').like('key', 'payment_%')
    if (!data?.length) return {}
    return Object.fromEntries(data.map(r => [r.key.replace('payment_', ''), r.value]))
  } catch {
    return {}
  }
}

// Reference code e.g. SGD-DIU-4821 — the user quotes this with their payment.
export function generateReferenceCode(seed = '') {
  const letters = ((seed || '').replace(/[^a-zA-Z]/g, '').toUpperCase() + 'XXX').slice(0, 3)
  const num = Math.floor(1000 + Math.random() * 9000)
  return `SGD-${letters}-${num}`
}

// A member counts as active only while their paid period hasn't expired.
export function isActiveMember(member) {
  return !!member && member.status === 'active' && !!member.expires_at && new Date(member.expires_at) > new Date()
}

// ── Weekly free rotation ─────────────────────────────────────────────
// Exactly FREE_PER_WEEK songs are free each week. We rank the whole catalogue
// by a week-seeded hash and take the top N — deterministic, identical for
// everyone, rotates automatically every week, needs no DB writes, works
// offline. (The DB `free` flag is ignored on purpose — every song is currently
// flagged free for testing, which would defeat the rotation. Pin a song as
// always-free later with `always_free: true`.)
export const FREE_PER_WEEK = 50

function hash(str) {
  let h = 5381
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

// Current week index (UTC). Changes once every 7 days.
export function weekNumber() {
  return Math.floor(Date.now() / (7 * 86400000))
}

// Memoised set of this week's free song ids (recomputed when the week changes
// or the catalogue size changes). Never cached while the catalogue is empty.
let _freeCache = { week: null, len: 0, ids: null }
function freeSetForWeek() {
  const wk = weekNumber()
  const cat = getCachedCatalog() || []
  if (_freeCache.week === wk && _freeCache.len === cat.length && _freeCache.ids) return _freeCache.ids
  if (!cat.length) return new Set()
  const ids = new Set(
    cat
      .map(s => ({ id: String(s.id), h: hash(`${s.id}:${wk}`) }))
      .sort((a, b) => a.h - b.h)
      .slice(0, FREE_PER_WEEK)
      .map(r => r.id)
  )
  _freeCache = { week: wk, len: cat.length, ids }
  return ids
}

// Is this song free during the current week?
export function isFreeThisWeek(song) {
  if (!song) return false
  if (song.always_free) return true // optional pin
  return freeSetForWeek().has(String(song.id))
}

// Whether a song is accessible to the current user.
// While LOCK_CONTENT is false this is always true (nothing is gated yet).
export function canAccess(song, isMember) {
  return !LOCK_CONTENT || isMember || isFreeThisWeek(song)
}

// Loads the current auth user + their members row; recomputes on auth changes.
export function useMembership() {
  const [user, setUser] = useState(null)
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user && isConfigured) {
      const { data } = await supabase.from('members').select('*').eq('id', user.id).single()
      setMember(data || null)
    } else {
      setMember(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => load())
    return () => sub?.subscription?.unsubscribe?.()
  }, [load])

  return { user, member, isMember: isActiveMember(member), loading, refresh: load }
}
