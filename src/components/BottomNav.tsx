import { useLocation, useNavigate } from 'react-router-dom'
import { Pencil, Calendar, BarChart3 } from 'lucide-react'

const tabs = [
  { path: '/', label: '今日', Icon: Pencil },
  { path: '/history', label: '历史', Icon: Calendar },
  { path: '/stats', label: '统计', Icon: BarChart3 },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 safe-bottom z-50">
      <div className="flex justify-around py-3">
        {tabs.map(({ path, label, Icon }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-6 py-1 rounded-lg transition-colors ${
                active ? 'text-indigo-400' : 'text-slate-500'
              }`}
            >
              <Icon size={22} />
              <span className="text-xs">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
