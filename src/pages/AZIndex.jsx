import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { MOCK_SONGS } from '../lib/mockData'

const FIJIAN_ALPHABET = ['A','B','C','D','E','F','G','I','K','L','M','N','Q','R','S','T','U','V','W','Y']

export default function AZIndex() {
  const nav = useNavigate()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const letterRefs = useRef({})

  useEffect(() => {
    async function load() {
      if (!isConfigured) {
        setSongs(MOCK_SONGS.map(s => ({ id: s.id, title: s.title, category: s.category, free: s.free })))
        setLoading(false)
        return
      }
      const { data, error } = await supabase.from('songs').select('id,title,category,free').order('title')
      if (error) setError(error.message)
      else setSongs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const grouped = FIJIAN_ALPHABET.reduce((acc, letter) => {
    const group = songs.filter(s => s.title?.toUpperCase().startsWith(letter))
    if (group.length) acc[letter] = group
    return acc
  }, {})

  function scrollTo(letter) {
    letterRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ paddingBottom: 80, position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px' }}>
        <h1 className="font-playfair" style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>A–Z Index</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>{songs.length} songs in the archive</p>
      </div>

      {loading && <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Loading…</div>}
      {error && <div style={{ margin: '0 20px', color: 'var(--danger)', fontSize: 14 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ display: 'flex', padding: '0 0 0 20px' }}>
          {/* Song list */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 32 }}>
            {Object.entries(grouped).map(([letter, group]) => (
              <div key={letter} ref={el => letterRefs.current[letter] = el}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 0 8px' }}>
                  <span className="font-playfair" style={{ color: 'var(--accent)', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{letter}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
                {group.map((song, i) => (
                  <button key={song.id} onClick={() => nav(`/song/${song.id}`)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid rgba(255,255,255,0.05)`, textAlign: 'left' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{song.title}</p>
                      <p style={{ fontSize: 11.5, color: 'var(--text2)', marginTop: 1 }}>{song.category}</p>
                    </div>
                    {!song.free && <Lock size={13} color="var(--gold)" style={{ flexShrink: 0, marginLeft: 8 }} />}
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <p style={{ color: 'var(--text3)', fontSize: 14, padding: '20px 0' }}>No songs yet.</p>
            )}
          </div>

          {/* Alpha rail */}
          <div style={{ position: 'fixed', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 2, zIndex: 10 }}>
            {FIJIAN_ALPHABET.map(letter => (
              <button key={letter} onClick={() => scrollTo(letter)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: grouped[letter] ? 'var(--text2)' : 'var(--text3)', fontSize: 10, fontWeight: 700, padding: '2px 6px', lineHeight: 1.4, opacity: grouped[letter] ? 1 : 0.4 }}>
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
