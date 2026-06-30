import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import Home from './pages/Home'
import Song from './pages/Song'
import SingMode from './pages/SingMode'
import AZIndex from './pages/AZIndex'
import Upload from './pages/Upload'
import Admin from './pages/Admin'
import LyricSync from './pages/LyricSync'
import TapSync from './pages/TapSync'
import Artists from './pages/Artists'
import Account from './pages/Account'
import Legal from './pages/Legal'
import Browse from './pages/Browse'
import Favorites from './pages/Favorites'
import BottomTabBar from './components/BottomTabBar'

function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '0 32px', textAlign: 'center' }}>
      <p style={{ fontSize: 64, marginBottom: 8 }}>🎵</p>
      <h1 className="font-playfair" style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Page not found</h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>That page doesn't exist — maybe the link changed?</p>
      <Link to="/" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '12px 28px', borderRadius: 12, textDecoration: 'none' }}>
        Go to Home
      </Link>
    </div>
  )
}

function Layout() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const hideNav = pathname.startsWith('/sing') || pathname.startsWith('/admin') || pathname.startsWith('/upload') || pathname.startsWith('/lyric-sync') || pathname.startsWith('/tap-sync')
    || ['/terms', '/privacy', '/copyright', '/404'].includes(pathname)

  // Android hardware/gesture back button → navigate within the app instead of minimizing.
  useEffect(() => {
    let handle
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (window.location.pathname !== '/' && canGoBack) {
        nav(-1)
      } else {
        CapApp.minimizeApp()
      }
    }).then(h => { handle = h }).catch(() => {})
    return () => { if (handle) handle.remove() }
  }, [nav])
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', maxWidth: 480, margin: '0 auto' }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/song/:id" element={<Song />} />
        <Route path="/sing/:id" element={<SingMode />} />
        <Route path="/index" element={<AZIndex />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/lyric-sync" element={<LyricSync />} />
        <Route path="/tap-sync/:id" element={<TapSync />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/account" element={<Account />} />
        <Route path="/terms" element={<Legal type="terms" />} />
        <Route path="/privacy" element={<Legal type="privacy" />} />
        <Route path="/copyright" element={<Legal type="copyright" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideNav && <BottomTabBar />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
