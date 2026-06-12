import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'
import BottomNav from './components/BottomNav'
import TodayPage from './pages/TodayPage'
import FitnessPage from './pages/FitnessPage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'

const APP_VERSION = '1.5'

function useDarkMode() {
  useEffect(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored === 'true') document.documentElement.classList.add('dark')
  }, [])
}

export default function App() {
  useDarkMode()
  const [showUpdate, setShowUpdate] = useState(false)

  const {
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() { setShowUpdate(true) },
    onOfflineReady() {},
  })

  const doUpdate = async () => {
    await updateServiceWorker(true)
    setShowUpdate(false)
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-slate-950 text-[#3d3535] dark:text-slate-200 pb-24">
      {/* Update banner */}
      {showUpdate && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#c97d6b] text-white px-4 py-3 flex items-center justify-between safe-top">
          <span className="text-sm font-medium">有新版本可用</span>
          <button
            onClick={doUpdate}
            className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5 text-sm font-medium active:bg-white/30 transition-colors"
          >
            <RefreshCw size={14} />
            立即更新
          </button>
        </div>
      )}

      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/fitness" element={<FitnessPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
      <BottomNav />

      {/* Version indicator */}
      <div className="fixed bottom-24 right-3 text-[10px] text-[#d4cbc2] dark:text-slate-600 select-none pointer-events-none">
        v{APP_VERSION}
      </div>
    </div>
  )
}
