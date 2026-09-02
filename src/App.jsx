import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import DetailPage from './pages/DetailPage'

export default function App() {
  return (
    <div className="min-h-full bg-base text-gray-200">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/detail/:ticker" element={<DetailPage />} />
      </Routes>
    </div>
  )
}
