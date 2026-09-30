import test from 'node:test'
import assert from 'node:assert/strict'
import { activeLyricLine, completedTaps, backingTrack } from '../src/lib/timing.js'

const lines = ['VERSE 1', 'First line', 'CHORUS', 'Repeat', 'VERSE 2', 'Another line', 'CHORUS', 'Repeat']
const timings = [
  { line: 'First line', start_time: 5 },
  { line: 'Repeat', start_time: 12 },
  { line: 'Another line', start_time: 25 },
  { line: 'Repeat', start_time: 40 },
]
test('intro does not highlight the first lyric prematurely', () => {
  assert.equal(activeLyricLine(timings, lines, 0), -1)
  assert.equal(activeLyricLine(timings, lines, 4.99), -1)
})
test('imported timings skip headings and match repeated choruses in order', () => {
  assert.equal(activeLyricLine(timings, lines, 5), 1)
  assert.equal(activeLyricLine(timings, lines, 12), 3)
  assert.equal(activeLyricLine(timings, lines, 40), 7)
})
test('buffering preserves position and seeking backwards restores an earlier line', () => {
  assert.deepEqual([25, 25, 25, 6].map(t => activeLyricLine(timings, lines, t)), [5, 5, 5, 1])
})
test('tap-sync records that include headings remain aligned', () => {
  const full = [{ line: 'VERSE 1', start_time: 5 }, { line: 'First line', start_time: 5 }]
  assert.equal(activeLyricLine(full, lines, 5), 1)
})

test('verse and chorus headings do not prematurely complete the tap session', () => {
  const taps = { 0: 5, 1: 5, 2: 12, 3: 12 }
  assert.equal(completedTaps(lines, taps), 2)
  assert.equal(completedTaps(lines, { ...taps, 4: 25, 5: 25, 6: 40, 7: 40 }), 4)
})
test('sync and playback select the same recording and use consistent fallbacks', () => {
  const song = { reference_url: 'reference', instrumental_url: 'instrumental', audio_url: 'audio' }
  assert.equal(backingTrack(song, 'sheet'), 'reference')
  assert.equal(backingTrack(song, 'karaoke'), 'instrumental')
  assert.equal(backingTrack({ reference_url: 'reference' }, 'karaoke'), 'reference')
  assert.equal(backingTrack({ audio_url: 'audio' }, 'sheet'), 'audio')
})
