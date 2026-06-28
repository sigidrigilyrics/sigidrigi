import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, Heart, User, Mic } from 'lucide-react'
import { getCachedCatalog } from '../lib/songs'

// Picks a stable "song of the day" so the centre Sing button always has a song.
function songOfTheDay() {
  const cat = getCachedCatalog() || []
  if (!cat.length) return null
  const day = Math.floor(Date.now() / 86400000)
  const pool = cat.filter(s => s.verified || s.free)
  const base = pool.length ? pool : cat
  return base[(day * 3) % base.length]
}

export default function BottomTabBar() {
  const nav = useNavigate()
  const { pathname } = useLocation()

  const tabs = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Search', icon: Search, path: '/browse' },
    { label: 'Favorites', icon: Heart, path: '/favorites' },
    { label: 'Profile', icon: User, path: '/account' },
  ]
  const active = (path) => pathname === path

  function startSing() {
    const s = songOfTheDay()
    nav(s ? `/sing/${s.id}` : '/browse')
  }

  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 50, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', padding: '10px 6px 14px' }}>
      {/* Left two tabs */}
      {tabs.slice(0, 2).map(({ label, icon: Icon, path }) => (
        <Tab key={label} label={label} Icon={Icon} isActive={active(path)} onClick={() => nav(path)} />
      ))}

      {/* Centre Sing button (raised) */}
      <button onClick={startSing} aria-label="Sing"
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, marginTop: -22 }}>
        <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(0,229,160,0.45)', border: '4px solid #0A0A0A' }}>
          <Mic size={24} color="#000" />
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--accent)' }}>Sing</span>
      </button>

      {/* Right two tabs */}
      {tabs.slice(2).map(({ label, icon: Icon, path }) => (
        <Tab key={label} label={label} Icon={Icon} isActive={active(path)} onClick={() => nav(path)} />
      ))}
    </div>
  )
}

function Tab({ label, Icon, isActive, onClick }) {
  return (
    <button onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: isActive ? 'var(--accent)' : 'var(--text3)', minWidth: 56, paddingTop: 4 }}>
      <Icon size={20} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
    </button>
  )
}
