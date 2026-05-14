import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { db, type Entry } from '../db'

const MOOD_COLORS: Record<number, string> = {
  5: 'bg-[#6db37a]',
  4: 'bg-[#a3c9a8]',
  3: 'bg-[#e8c76a]',
  2: 'bg-[#e09e6e]',
  1: 'bg-[#c97d6b]',
}

const MOOD_EMOJIS: Record<number, string> = { 5: '😄', 4: '🙂', 3: '😐', 2: '😔', 1: '😢' }

const DAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日']

interface SearchResult { date: string; mood: number; snippet: string }

export default function HistoryPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [entries, setEntries] = useState<Entry[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    db.entries.where('date').between(start, end, true, true).toArray().then(setEntries)
  }, [year, month])

  // Search
  const onSearch = (q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setSearching(false); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const all = await db.entries.filter(e => e.journal.toLowerCase().includes(q.toLowerCase())).toArray()
      all.sort((a, b) => b.date.localeCompare(a.date))
      setResults(all.slice(0, 20).map(e => {
        const idx = e.journal.toLowerCase().indexOf(q.toLowerCase())
        const start = Math.max(0, idx - 20)
        const end = Math.min(e.journal.length, idx + q.length + 40)
        let snippet = e.journal.slice(start, end)
        if (start > 0) snippet = '...' + snippet
        if (end < e.journal.length) snippet = snippet + '...'
        return { date: e.date, mood: e.mood, snippet }
      }))
    }, 300)
  }

  // Cleanup
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

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
      {/* Search bar */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b8a99a] dark:text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => onSearch(e.target.value)}
          placeholder="搜索日记..."
          className="w-full bg-white dark:bg-slate-900 rounded-xl pl-9 pr-8 py-2.5 text-sm text-[#3d3535] dark:text-slate-100 placeholder-[#d4cbc2] dark:placeholder-slate-500 outline-none border border-[#efe8e0] dark:border-slate-700 focus:border-[#c97d6b]/30 transition-colors"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setSearching(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#b8a99a] dark:text-slate-400">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search results */}
      {searching && (
        <div className="space-y-2 mb-6">
          {results.length === 0 ? (
            <p className="text-sm text-[#b8a99a] dark:text-slate-400 text-center py-4">无搜索结果</p>
          ) : (
            results.map(r => (
              <button
                key={r.date}
                onClick={() => navigate(`/?date=${r.date}`)}
                className="card p-4 w-full text-left block"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-[#c97d6b] dark:text-rose-400 font-medium">{r.date}</span>
                  {r.mood > 0 && <span>{MOOD_EMOJIS[r.mood]}</span>}
                </div>
                <p className="text-sm text-[#8b7e74] dark:text-slate-300 leading-relaxed font-serif line-clamp-2">{r.snippet}</p>
              </button>
            ))
          )}
        </div>
      )}

      {/* Calendar header */}
      {!searching && (
        <>
          <div className="flex items-center justify-between mb-8">
            <button onClick={prevMonth} className="p-2 -ml-2 text-[#b8a99a] dark:text-slate-400 hover:text-[#8b7e74] transition-colors">
              <ChevronLeft size={22} />
            </button>
            <h1 className="text-xl font-bold text-[#3d3535] dark:text-slate-100 font-serif">
              {year}年{month}月
            </h1>
            <button onClick={nextMonth} className="p-2 -mr-2 text-[#b8a99a] dark:text-slate-400 hover:text-[#8b7e74] transition-colors">
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="card p-5">
            <div className="grid grid-cols-7 gap-1 mb-3">
              {DAY_HEADERS.map(h => (
                <div key={h} className="text-center text-xs text-[#b8a99a] dark:text-slate-400 font-medium py-1">{h}</div>
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
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all hover:bg-[#faf8f5] dark:hover:bg-slate-800 ${
                      isToday ? 'ring-2 ring-[#c97d6b]/30' : ''
                    } ${entry?.mood ? 'bg-[#faf8f5] dark:bg-slate-800' : ''}`}
                  >
                    <span className={`text-sm ${isToday ? 'text-[#c97d6b] dark:text-rose-400 font-semibold' : 'text-[#3d3535] dark:text-slate-100'}`}>
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
        </>
      )}
    </div>
  )
}
