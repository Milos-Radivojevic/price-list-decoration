import { Routes, Route } from 'react-router-dom'
import Gallery from './pages/Gallery'
import Admin from './pages/Admin'
import Kontakt from './pages/Kontakt'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/kontakt" element={<Kontakt />} />
      <Route path="/admin/*" element={<Admin />} />
    </Routes>
  )
}

export default App
