import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { db, type Entry } from '../db'

const MOOD_COLORS: Record<number, string> = {
  5: 'bg-green-400',
  4: 'bg-green-300',
  3: 'bg-yellow-400',
  2: 'bg-orange-400',
  1: 'bg-red-400',
}

const DAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日']

export default function HistoryPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    db.entries.where('date').between(start, end, true, true).toArray().then(setEntries)
  }, [year, month])

  const entryMap = new Map(entries.map(e => [e.date, e]))

  const daysInMonth = new Date(year, month, 0).getDate()
  const startDayOfWeek = new Date(year, month - 1, 1).getDay()
  const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

  const cells: (number | null)[] = []
  for (let i = 0; i < adjustedStart; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (year === now.getFullYear() && month === now.getMonth() + 1) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const goToDay = (day: number) => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    navigate(`/?date=${date}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-slate-200">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-slate-200">
          {year}年{month}月
        </h1>
        <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-slate-200">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_HEADERS.map(h => (
          <div key={h} className="text-center text-xs text-slate-500 py-1">{h}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const entry = entryMap.get(dateStr)
          const isToday =
            now.getFullYear() === year &&
            now.getMonth() + 1 === month &&
            now.getDate() === day

          return (
            <button
              key={day}
              onClick={() => goToDay(day)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors hover:bg-slate-800 ${
                isToday ? 'ring-1 ring-indigo-400' : ''
              }`}
            >
              <span className="text-slate-300">{day}</span>
              {entry?.mood ? (
                <div className={`w-2 h-2 rounded-full mt-0.5 ${MOOD_COLORS[entry.mood]}`} />
              ) : (
                <div className="w-2 h-2 mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
