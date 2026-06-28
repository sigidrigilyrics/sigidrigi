import { useState } from 'react'
import { getCardImage } from '../lib/images'

// A photo background for a song with a dark gradient overlay for legibility.
// Falls back to a teal gradient + the song's initial if the image fails.
// Pass `overlay` to control how dark the scrim is (default 'bottom').
export default function CardImage({ song, src, radius = 16, children, overlay = 'bottom', style = {} }) {
  const [failed, setFailed] = useState(false)
  const url = src || getCardImage(song)

  const scrim =
    overlay === 'full'
      ? 'linear-gradient(180deg, rgba(7,7,7,0.35), rgba(7,7,7,0.78))'
      : overlay === 'soft'
      ? 'linear-gradient(180deg, rgba(7,7,7,0.1), rgba(7,7,7,0.55))'
      : 'linear-gradient(180deg, rgba(7,7,7,0) 30%, rgba(7,7,7,0.85))'

  return (
    <div style={{
      position: 'relative', borderRadius: radius, overflow: 'hidden',
      background: failed
        ? 'linear-gradient(150deg,#0e3328,#0A0A0A)'
        : `${scrim}, url(${url}) center/cover no-repeat`,
      ...style,
    }}>
      {/* Hidden loader to detect a broken image and switch to the fallback */}
      {!failed && <img src={url} alt="" onError={() => setFailed(true)} style={{ display: 'none' }} />}
      {failed && song?.title && (
        <span className="font-playfair" style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          color: 'rgba(0,229,160,0.35)', fontSize: 64, fontWeight: 800,
        }}>{song.title[0]}</span>
      )}
      {children}
    </div>
  )
}
