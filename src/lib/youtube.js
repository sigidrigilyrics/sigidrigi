// YouTube IFrame Player API helpers — used to play a hidden instrumental track
// in Sing Mode, synced to the scrolling lyrics via the player's currentTime.

// Extract the 11-char video ID from a real YouTube URL.
// Returns null for non-video URLs (e.g. the /results?search_query= fallback links),
// so those are correctly ignored as a playable source.
export function getYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/)
  return m ? m[1] : null
}

// Load the IFrame Player API once; resolve with window.YT when ready.
let apiPromise = null
export function loadYouTubeAPI() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady
    const tag = document.createElement('script')
    const fail = () => {
      clearTimeout(timeout)
      tag.remove()
      window.onYouTubeIframeAPIReady = prev
      apiPromise = null
      reject(new Error('Music could not load. Check your connection and try again.'))
    }
    const timeout = setTimeout(fail, 12000)
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout)
      resolve(window.YT)
      if (typeof prev === 'function') prev()
    }
    tag.onerror = fail
    tag.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(tag)
  })
  return apiPromise
}
