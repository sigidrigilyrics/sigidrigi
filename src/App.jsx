import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Song from './pages/Song'
import SingMode from './pages/SingMode'
import AZIndex from './pages/AZIndex'
import Upload from './pages/Upload'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ background: 'var(--bg)', minHeight: '100vh', maxWidth: 480, margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/song/:id" element={<Song />} />
          <Route path="/sing/:id" element={<SingMode />} />
          <Route path="/index" element={<AZIndex />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
