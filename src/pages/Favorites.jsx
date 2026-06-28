import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { loadCatalog, getCachedCatalog } from '../lib/songs'
import { useFavorites } from '../lib/favorites'
import { useMembership } from '../lib/membership'
import SongRow from '../components/SongRow'

export default function Favorites() {
  const nav = useNavigate()
  const [songs, setSongs] = useState(() => getCachedCatalog() || [])
  const { favorites } = useFavorites()
  const { isMember } = useMembership()

  useEffect(() => { loadCatalog().then(({ songs }) => { if (songs.length) setSongs(songs) }) }, [])

  const favSongs = favorites.map(id => songs.find(s => s.id === id)).filter(Boolean)

  return (
    <div style={{ paddingBottom: 96 }}>
      <div style={{ padding: '50px 20px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>Your songs</p>
        <h1 className="font-playfair" style={{ fontSize: 30, fontWeight: 800 }}>Favorites</h1>
      </div>

      <div style={{ padding: '0 20px' }}>
        {favSongs.length === 0 ? (
          <div style={{ background: 'var(--bg1)', borderRadius: 16, padding: '32px 20px', textAlign: 'center', marginTop: 8 }}>
            <Heart size={26} color="var(--text3)" style={{ marginBottom: 10 }} />
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>Tap the ♥ on any song to save it here for quick singing.</p>
            <button onClick={() => nav('/browse')}
              style={{ marginTop: 16, background: 'var(--accent)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 14, padding: '11px 24px', cursor: 'pointer' }}>
              Browse songs
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 6 }}>
              {favSongs.length} saved
            </p>
            {favSongs.map(s => (
              <SongRow key={s.id} song={s} isMember={isMember} onClick={() => nav(`/song/${s.id}`)} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
