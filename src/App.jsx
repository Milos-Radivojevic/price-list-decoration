import { Routes, Route } from 'react-router-dom'
import Gallery from './pages/Gallery'
import Admin from './pages/Admin'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/admin/*" element={<Admin />} />
    </Routes>
  )
}

export default App
