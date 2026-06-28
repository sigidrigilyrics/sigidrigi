// Shared card-image system.
// We bundle ~8 royalty-free Pacific photos in public/images/cards/ and assign
// one to each song deterministically, so a song always shows the same image
// (no per-song photography needed across 1,500+ songs). See CREDITS.txt.

const CARD_COUNT = 8

// Simple stable string hash (djb2) so the same id always maps to the same card.
function hashString(str) {
  let h = 5381
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

// Returns the public path to this song's card image.
export function getCardImage(song) {
  const seed = song?.id ?? song?.title ?? ''
  const n = (hashString(seed) % CARD_COUNT) + 1
  return `/images/cards/card${n}.jpg`
}

// A fixed image for a category tile (stable per category name).
export function getCategoryImage(category) {
  const n = (hashString(category) % CARD_COUNT) + 1
  return `/images/cards/card${n}.jpg`
}
