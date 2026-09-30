import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'

async function setup() {
  let reads = 0
  let requests = 0
  let resolve
  let response = new Promise(r => { resolve = r })
  let stored = JSON.stringify({ songs: [{ id: 'old', title: 'Cached song' }] })
  const query = { select() { return this }, order() { return response }, eq() { return this }, single() { return response } }
  const supabase = { from() { requests++; return query } }
  const context = createContext({ localStorage: {
    getItem() { reads++; return stored }, setItem(_key, value) { stored = value },
  } })
  const dependency = new SyntheticModule(['supabase', 'isConfigured', 'MOCK_SONGS'], function () {
    this.setExport('supabase', supabase); this.setExport('isConfigured', true); this.setExport('MOCK_SONGS', [])
  }, { context })
  const module = new SourceTextModule(await readFile(new URL('../src/lib/songs.js', import.meta.url), 'utf8'), { context })
  await module.link(() => dependency)
  await module.evaluate()
  return { api: module.namespace, reads: () => reads, requests: () => requests, finish: value => resolve(value) }
}

test('cached navigation reads storage once and avoids reparsing on every song', async () => {
  const s = await setup()
  assert.equal(s.api.findCachedSong('old').title, 'Cached song')
  for (let i = 0; i < 100; i++) s.api.findCachedSong('old')
  assert.equal(s.reads(), 1)
  assert.equal(s.requests(), 0)
})
test('concurrent catalogue consumers share one request and refresh memory', async () => {
  const s = await setup()
  const first = s.api.loadCatalog()
  const second = s.api.loadCatalog()
  assert.equal(first, second)
  s.finish({ data: [{ id: 'new', title: 'Fresh song' }], error: null })
  await first
  assert.equal(s.requests(), 1)
  assert.equal(s.api.findCachedSong('new').title, 'Fresh song')
})
test('song requests deduplicate and network failures retain cached lyrics', async () => {
  const s = await setup()
  const first = s.api.loadSong('old')
  assert.equal(first, s.api.loadSong('old'))
  s.finish({ data: null, error: new Error('offline') })
  const result = await first
  assert.equal(result.song.title, 'Cached song')
  assert.equal(result.offline, true)
  assert.equal(s.requests(), 1)
})
