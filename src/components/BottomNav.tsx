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
    <nav className="fixed bottom-4 left-0 right-0 flex justify-center safe-bottom z-50 px-4">
      <div className="flex gap-1 bg-white/80 backdrop-blur-lg rounded-2xl px-2 py-2 shadow-lg shadow-black/5 border border-[#efe8e0]">
        {tabs.map(({ path, label, Icon }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-[#f8ede8] text-[#c97d6b]'
                  : 'text-[#b8a99a] hover:text-[#8b7e74]'
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
