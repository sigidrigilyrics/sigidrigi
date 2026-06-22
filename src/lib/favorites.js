import { useState, useEffect, useCallback } from 'react'

// Favorites are stored locally so they work instantly with no login required.
// When accounts matter (Phase 5), this can sync to a Supabase `favorites` table.
const KEY = 'sigidrigi_favorites'
const EVT = 'sigidrigi-favorites-changed'

export function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function writeFavorites(ids) {
  localStorage.setItem(KEY, JSON.stringify(ids))
  window.dispatchEvent(new Event(EVT))
}

export function toggleFavorite(id) {
  const favs = getFavorites()
  const next = favs.includes(id) ? favs.filter(x => x !== id) : [id, ...favs]
  writeFavorites(next)
  return next
}

export function useFavorites() {
  const [favorites, setFavs] = useState(getFavorites)
  useEffect(() => {
    const sync = () => setFavs(getFavorites())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  const isFavorite = useCallback(id => favorites.includes(id), [favorites])
  const toggle = useCallback(id => toggleFavorite(id), [])
  return { favorites, isFavorite, toggle }
}
