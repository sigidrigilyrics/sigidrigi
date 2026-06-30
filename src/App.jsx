import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import Home from './pages/Home'
import Song from './pages/Song'
import SingMode from './pages/SingMode'
import AZIndex from './pages/AZIndex'
import Upload from './pages/Upload'
import Admin from './pages/Admin'
import LyricSync from './pages/LyricSync'
import Artists from './pages/Artists'
import Account from './pages/Account'
import Legal from './pages/Legal'
import Browse from './pages/Browse'
import Favorites from './pages/Favorites'
import BottomTabBar from './components/BottomTabBar'

function Layout() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const hideNav = pathname.startsWith('/sing') || pathname.startsWith('/admin') || pathname.startsWith('/upload') || pathname.startsWith('/lyric-sync')
    || ['/terms', '/privacy', '/copyright'].includes(pathname)

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
        <Route path="/artists" element={<Artists />} />
        <Route path="/account" element={<Account />} />
        <Route path="/terms" element={<Legal type="terms" />} />
        <Route path="/privacy" element={<Legal type="privacy" />} />
        <Route path="/copyright" element={<Legal type="copyright" />} />
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
