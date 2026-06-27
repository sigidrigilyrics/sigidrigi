import { useState, useEffect, useCallback } from 'react'
import { supabase, isConfigured } from './supabase'

// ── Master paywall flag ──────────────────────────────────────────────
// While false, EVERY song stays open (testing / content-loading phase).
// Flip to true at launch to turn on the members-only paywall.
export const LOCK_CONTENT = false

export const MEMBERSHIP_PRICE = 5 // FJD / month

// Payment instructions shown on the Subscribe screen.
// ⚠️ FILL THESE IN with your real details before launch.
export const PAYMENT_DETAILS = {
  MPaisa: '<your MPaisa number>',
  MyCash: '<your MyCash number>',
  PayPal: '<your PayPal email or link>',
  Bank: '<your bank name, account name & number>',
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

// Whether a song is accessible to the current user.
// While LOCK_CONTENT is false this is always true (nothing is gated yet).
export function canAccess(song, isMember) {
  return !LOCK_CONTENT || isMember || !!(song && song.free)
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
