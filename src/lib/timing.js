// Returns a displayed lyric index, including when an imported timing list omits
// verse headings. Matching progresses forward so repeated choruses stay distinct.
export function activeLyricLine(timings, lines, time) {
  let active = -1
  let cursor = 0
  for (const timing of timings) {
    const start = Number(timing.start_time)
    if (!Number.isFinite(start) || start < 0) continue
    const text = String(timing.line || '').trim().toLowerCase()
    const match = lines.findIndex((line, index) => index >= cursor && line.trim().toLowerCase() === text)
    const index = match >= 0 ? match : cursor
    cursor = index + 1
    if (time >= start && index < lines.length) active = index
  }
  return active
}
export const isLyricHeading = line => /^(verse|chorus|bridge|outro|pre-?chorus|intro|hook|\[)/i.test(line.trim())

export function sungLineIndices(lines) {
  return lines.map((line, index) => isLyricHeading(line) ? -1 : index).filter(index => index >= 0)
}

export function completedTaps(lines, taps) {
  return sungLineIndices(lines).filter(index => Number.isFinite(taps[index])).length
}

export function backingTrack(song, view) {
  return (view === 'sheet'
    ? song?.reference_url || song?.instrumental_url
    : song?.instrumental_url || song?.reference_url) || song?.audio_url || ''
}
