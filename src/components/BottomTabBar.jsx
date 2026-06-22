import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, User, Mic2 } from 'lucide-react'

export default function BottomTabBar() {
  const nav = useNavigate()
  const { pathname } = useLocation()

  const tabs = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Search', icon: Search, path: '/?search=1' },
    { label: 'Artists', icon: Mic2, path: '/artists' },
    { label: 'Index', icon: null, path: '/index' },
    { label: 'Account', icon: User, path: '/account' },
  ]

  const active = (path) => pathname === path.split('?')[0]

  return (
    <div style={{ background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-3 px-1"
      style={{ background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', maxWidth: 480, margin: '0 auto', left: '50%', transform: 'translateX(-50%)', width: '100%', zIndex: 50 }}>
      {tabs.map(({ label, icon: Icon, path }) => {
        const isActive = active(path)
        return (
          <button key={label} onClick={() => nav(path.split('?')[0])}
            style={{ color: isActive ? 'var(--accent)' : 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}
            className="flex flex-col items-center gap-1">
            {label === 'Index' ? (
              <span className="font-playfair" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: isActive ? 'var(--accent)' : 'var(--text3)' }}>Az</span>
            ) : (
              <Icon size={20} />
            )}
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
