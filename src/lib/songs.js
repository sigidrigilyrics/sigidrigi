import { supabase, isConfigured } from './supabase'
import { MOCK_SONGS } from './mockData'

// Cache-first catalog so the app works offline (vital for Pacific / diaspora data).
// The full catalogue (lyrics included) is small enough to keep in localStorage:
// ~200 songs ≈ 400KB, well under the ~5MB limit, scales fine toward 1,000.
const CACHE_KEY = 'sigidrigi_catalog_v1'
let memoryCatalog = null
let catalogRequest = null
const songRequests = new Map()

export function getCachedCatalog() {
  if (memoryCatalog) return memoryCatalog
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { songs } = JSON.parse(raw)
    memoryCatalog = Array.isArray(songs) ? songs : null
    return memoryCatalog
  } catch {
    return null
  }
}

function setCachedCatalog(songs) {
  memoryCatalog = songs
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), songs }))
  } catch {
    /* quota exceeded — ignore, network still works */
  }
}

export function findCachedSong(id) {
  const c = getCachedCatalog()
  return c ? c.find(s => String(s.id) === String(id)) || null : null
}

// Returns { songs, offline }. Tries network, caches on success, falls back to cache offline.
export function loadCatalog() {
  if (!catalogRequest) catalogRequest = fetchCatalog().finally(() => { catalogRequest = null })
  return catalogRequest
}

export function cacheSong(song) {
  const catalog = getCachedCatalog()
  if (!catalog) return
  setCachedCatalog(catalog.map(item => String(item.id) === String(song.id) ? song : item))
}

async function fetchCatalog() {
  if (!isConfigured) { setCachedCatalog(MOCK_SONGS); return { songs: MOCK_SONGS, offline: false } }
  try {
    const { data, error } = await supabase.from('songs').select('*').order('title')
    if (error) throw error
    setCachedCatalog(data || [])
    return { songs: data || [], offline: false }
  } catch {
    const cached = getCachedCatalog()
    return { songs: cached || [], offline: true }
  }
}

// Returns { song, offline }. Network-fresh when online, cache when not.
export function loadSong(id) {
  const key = String(id)
  if (!songRequests.has(key)) {
    songRequests.set(key, fetchSong(id).finally(() => songRequests.delete(key)))
  }
  return songRequests.get(key)
}

async function fetchSong(id) {
  if (!isConfigured) {
    return { song: MOCK_SONGS.find(s => String(s.id) === String(id)) || null, offline: false }
  }
  try {
    const { data, error } = await supabase.from('songs').select('*').eq('id', id).single()
    if (error) throw error
    cacheSong(data)
    return { song: data, offline: false }
  } catch {
    const cached = findCachedSong(id)
    return { song: cached, offline: !!cached }
  }
}
