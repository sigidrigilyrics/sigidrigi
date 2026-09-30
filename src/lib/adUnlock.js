import { useCallback, useState, useSyncExternalStore } from 'react'

export const AD_UNLOCK_LIMIT = 3
const KEY = 'sigidrigi_ad_unlocks_v1'
let rewardedAdProvider = null
function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '{}')
    const day = new Date().toISOString().slice(0, 10)
    return value.day === day ? { day, songIds: Array.isArray(value.songIds) ? value.songIds : [] } : { day, songIds: [] }
  } catch { return { day: new Date().toISOString().slice(0, 10), songIds: [] } }
}
function write(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)) } catch { /* storage may be unavailable */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('sigidrigi-ad-unlocks-changed'))
}
export function getAdUnlocks() { return read().songIds }
export function hasAdUnlock(id) { return getAdUnlocks().includes(String(id)) }
// The native Android bridge registers this at startup. It must resolve only
// after the SDK confirms a completed, explicitly opted-in rewarded ad.
export function configureRewardedAdProvider(provider) {
  rewardedAdProvider = typeof provider === 'function' ? provider : null
}
export async function watchRewardedAd() {
  if (!rewardedAdProvider) throw new Error('Rewarded ads are not connected yet.')
  return rewardedAdProvider()
}
export function grantAdUnlock(id) {
  const current = read(); const songId = String(id)
  if (current.songIds.includes(songId)) return true
  if (current.songIds.length >= AD_UNLOCK_LIMIT) return false
  write({ ...current, songIds: [...current.songIds, songId] }); return true
}
function subscribe(listener) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('sigidrigi-ad-unlocks-changed', listener)
  return () => window.removeEventListener('sigidrigi-ad-unlocks-changed', listener)
}
const snapshot = () => getAdUnlocks().join('|')
export function useAdUnlock(id) {
  const unlockSnapshot = useSyncExternalStore(subscribe, snapshot, () => '')
  const unlocked = unlockSnapshot.split('|').includes(String(id))
  const [watching, setWatching] = useState(false); const [error, setError] = useState('')
  const watch = useCallback(async () => { setWatching(true); setError(''); try { if (!await watchRewardedAd() || !grantAdUnlock(id)) throw new Error('Unlock could not be granted.'); return true } catch (e) { setError(e.message); return false } finally { setWatching(false) } }, [id])
  return { unlocked, watching, error, watch, remaining: Math.max(0, AD_UNLOCK_LIMIT - getAdUnlocks().length) }
}
