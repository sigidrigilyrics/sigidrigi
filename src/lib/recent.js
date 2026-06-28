import { useState, useEffect } from 'react'

// Recently-played history — stored locally (no login needed), powers the
// "Recently played" rail on Home. Most-recent first, de-duplicated, capped.
const KEY = 'sigidrigi_recent'
const EVT = 'sigidrigi-recent-changed'
const CAP = 10

export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

// Record that a song was opened. Moves it to the front, trims to CAP.
export function pushRecent(id) {
  if (!id) return
  const next = [id, ...getRecent().filter(x => x !== id)].slice(0, CAP)
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(EVT))
}

export function useRecent() {
  const [recent, setRecent] = useState(getRecent)
  useEffect(() => {
    const sync = () => setRecent(getRecent())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return { recent }
}
