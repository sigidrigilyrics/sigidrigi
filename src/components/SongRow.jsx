import { Heart, Music, Lock } from 'lucide-react'
import { useFavorites } from '../lib/favorites'
import { canAccess, isFreeThisWeek, LOCK_CONTENT } from '../lib/membership'
import CardImage from './CardImage'

// One song in a list — photo thumbnail + title + category, with a music badge
// (has instrumental), a lock (only when content is gated for non-members), and
// a heart. The whole row navigates via onClick; the heart toggles a favorite.
export default function SongRow({ song, isMember = false, onClick }) {
  const { isFavorite, toggle } = useFavorites()
  const locked = LOCK_CONTENT && !canAccess(song, isMember)
  const fav = isFavorite(song.id)

  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
      <CardImage song={song} radius={12} overlay="soft" style={{ width: 50, height: 50, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
        <p style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--accent)' }}>{song.category || 'Traditional'}</span>
          {song.instrumental_url && <Music size={12} color="var(--accent)" />}
        </p>
      </div>
      {isFreeThisWeek(song) && (
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.4)', borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>FREE</span>
      )}
      {locked && <Lock size={15} color="var(--gold)" style={{ flexShrink: 0 }} />}
      <button onClick={e => { e.stopPropagation(); toggle(song.id) }}
        aria-label={fav ? 'Remove favorite' : 'Add favorite'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: fav ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }}>
        <Heart size={18} fill={fav ? 'var(--accent)' : 'none'} />
      </button>
    </div>
  )
}
