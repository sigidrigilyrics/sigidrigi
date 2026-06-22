import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Music } from 'lucide-react'
import { loadCatalog } from '../lib/songs'

export default function Artists() {
  const nav = useNavigate()
  const [artists, setArtists] = useState([])
  const [selected, setSelected] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { songs: data } = await loadCatalog()
      // Group by artist
      const map = {}
      data.forEach(s => {
        const a = s.artist || 'Unknown'
        if (!map[a]) map[a] = []
        map[a].push(s)
      })
      const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
      setArtists(sorted)
      setLoading(false)
    }
    load()
  }, [])

  function selectArtist(name, artistSongs) {
    setSelected(name)
    setSongs(artistSongs)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text2)' }}>
      Loading…
    </div>
  )

  // Artist song list view
  if (selected) return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setSelected(null)}
          style={{ background: 'var(--bg2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
          ←
        </button>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Artist</p>
          <h1 className="font-playfair" style={{ fontSize: 24, fontWeight: 800 }}>{selected}</h1>
        </div>
      </div>
      <p style={{ padding: '0 20px 12px', fontSize: 12, color: 'var(--text3)' }}>{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
      <div style={{ padding: '0 20px' }}>
        {songs.map(song => (
          <div key={song.id} onClick={() => nav(`/song/${song.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Music size={16} color="var(--accent)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
              {song.category && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{song.category}</p>}
            </div>
            {!song.free && <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>🔒</span>}
            <ChevronRight size={16} color="var(--text3)" />
          </div>
        ))}
      </div>
    </div>
  )

  // Artist list view
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '52px 20px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Browse</p>
        <h1 className="font-playfair" style={{ fontSize: 32, fontWeight: 800 }}>Artists</h1>
      </div>
      <div style={{ padding: '0 20px' }}>
        {artists.map(([name, artistSongs]) => (
          <div key={name} onClick={() => selectArtist(name, artistSongs)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--bg2), rgba(0,229,160,0.1))', border: '1px solid rgba(0,229,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="font-playfair" style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{name[0]}</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{name}</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{artistSongs.length} song{artistSongs.length !== 1 ? 's' : ''}</p>
            </div>
            <ChevronRight size={16} color="var(--text3)" />
          </div>
        ))}
      </div>
    </div>
  )
}
