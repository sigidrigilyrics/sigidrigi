import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import Home from './pages/Home'
import Song from './pages/Song'
import SingMode from './pages/SingMode'
import AZIndex from './pages/AZIndex'
import Upload from './pages/Upload'
import Admin from './pages/Admin'
import Artists from './pages/Artists'
import Account from './pages/Account'
import BottomTabBar from './components/BottomTabBar'

function Layout() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const hideNav = pathname.startsWith('/sing') || pathname.startsWith('/admin')

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
        <Route path="/upload" element={<Upload />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/account" element={<Account />} />
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
