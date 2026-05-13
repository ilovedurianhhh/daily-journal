import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { db, type Entry } from '../db'

const MOOD_COLORS: Record<number, string> = {
  5: 'bg-[#6db37a]',
  4: 'bg-[#a3c9a8]',
  3: 'bg-[#e8c76a]',
  2: 'bg-[#e09e6e]',
  1: 'bg-[#c97d6b]',
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
    <div className="max-w-lg mx-auto px-5 pt-8">
      <div className="flex items-center justify-between mb-8">
        <button onClick={prevMonth} className="p-2 -ml-2 text-[#b8a99a] hover:text-[#8b7e74] transition-colors">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-[#3d3535] font-serif">
          {year}年{month}月
        </h1>
        <button onClick={nextMonth} className="p-2 -mr-2 text-[#b8a99a] hover:text-[#8b7e74] transition-colors">
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-7 gap-1 mb-3">
          {DAY_HEADERS.map(h => (
            <div key={h} className="text-center text-xs text-[#b8a99a] font-medium py-1">{h}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
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
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all hover:bg-[#faf8f5] ${
                  isToday ? 'ring-2 ring-[#c97d6b]/30' : ''
                } ${entry?.mood ? 'bg-[#faf8f5]' : ''}`}
              >
                <span className={`text-sm ${isToday ? 'text-[#c97d6b] font-semibold' : 'text-[#3d3535]'}`}>
                  {day}
                </span>
                {entry?.mood ? (
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${MOOD_COLORS[entry.mood]}`} />
                ) : (
                  <div className="w-1.5 h-1.5 mt-1" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
