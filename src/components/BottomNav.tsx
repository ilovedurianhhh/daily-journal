import { useLocation, useNavigate } from 'react-router-dom'
import { Pencil, Dumbbell, Calendar, BarChart3 } from 'lucide-react'

const tabs = [
  { path: '/', label: '今日', Icon: Pencil },
  { path: '/fitness', label: '健身', Icon: Dumbbell },
  { path: '/history', label: '历史', Icon: Calendar },
  { path: '/stats', label: '统计', Icon: BarChart3 },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-4 left-0 right-0 flex justify-center safe-bottom z-50 px-2">
      <div className="flex gap-0.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg rounded-2xl px-1.5 py-2 shadow-lg shadow-black/5 border border-[#efe8e0] dark:border-slate-700">
        {tabs.map(({ path, label, Icon }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-medium transition-all ${
                active
                  ? 'bg-[#f8ede8] dark:bg-rose-950 text-[#c97d6b] dark:text-rose-400'
                  : 'text-[#b8a99a] dark:text-slate-400 hover:text-[#8b7e74] dark:hover:text-slate-300'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
