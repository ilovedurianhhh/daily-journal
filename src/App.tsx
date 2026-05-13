import { Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import TodayPage from './pages/TodayPage'
import FitnessPage from './pages/FitnessPage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'

export default function App() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#3d3535] pb-24">
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/fitness" element={<FitnessPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
