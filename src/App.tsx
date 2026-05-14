import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import TodayPage from './pages/TodayPage'
import FitnessPage from './pages/FitnessPage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'

function useDarkMode() {
  useEffect(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored === 'true') document.documentElement.classList.add('dark')
  }, [])
}

export default function App() {
  useDarkMode()

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-slate-950 text-[#3d3535] dark:text-slate-200 pb-24">
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
