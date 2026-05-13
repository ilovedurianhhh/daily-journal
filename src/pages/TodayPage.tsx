import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { db, type Entry } from '../db'
import MoodPicker from '../components/MoodPicker'
import JournalSection from '../components/JournalSection'
import ExpenseSection from '../components/ExpenseSection'

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDisplay(date: Date): string {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${date.getMonth() + 1}月${date.getDate()}日 周${weekdays[date.getDay()]}`
}

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h < 6) return { text: '夜深了', emoji: '🌙' }
  if (h < 9) return { text: '早上好', emoji: '☀️' }
  if (h < 12) return { text: '上午好', emoji: '🌤️' }
  if (h < 14) return { text: '中午好', emoji: '☀️' }
  if (h < 18) return { text: '下午好', emoji: '🌿' }
  if (h < 22) return { text: '晚上好', emoji: '🌆' }
  return { text: '夜深了', emoji: '🌙' }
}

const MOOD_EMOJIS: Record<number, string> = { 5: '😄', 4: '🙂', 3: '😐', 2: '😔', 1: '😢' }

function computeStreak(entries: Entry[]): number {
  const moodMap = new Map(entries.filter(e => e.mood > 0).map(e => [e.date, true]))
  let streak = 0
  const check = new Date()
  check.setDate(check.getDate() - 1) // start from yesterday
  while (true) {
    const ds = formatDate(check)
    if (moodMap.has(ds)) {
      streak++
      check.setDate(check.getDate() - 1)
    } else {
      break
    }
  }
  // Include today if mood is set
  const todayStr = formatDate(new Date())
  if (moodMap.has(todayStr)) streak++
  return streak
}

interface PastEntry { year: number; mood: number; journal: string; date: string }

export default function TodayPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const today = formatDate(new Date())
  const [currentDate, setCurrentDate] = useState(dateParam || today)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [streak, setStreak] = useState(0)
  const [pastEntries, setPastEntries] = useState<PastEntry[]>([])
  const isToday = currentDate === today

  const loadEntry = useCallback(async (date: string) => {
    let e = await db.entries.where('date').equals(date).first()
    if (!e) {
      const id = await db.entries.add({
        date,
        mood: 0,
        journal: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      e = await db.entries.get(id)
    }
    setEntry(e || null)
  }, [])

  // Load streak
  const loadStreak = useCallback(async () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 366)
    const entries = await db.entries
      .where('date').between(formatDate(start), formatDate(now), true, true)
      .toArray()
    setStreak(computeStreak(entries))
  }, [])

  // Load "on this day" entries
  const loadOnThisDay = useCallback(async (date: string) => {
    const currentYear = new Date().getFullYear()
    const [_, m, d] = date.split('-')
    const results: PastEntry[] = []
    for (let y = currentYear - 1; y >= currentYear - 10; y--) {
      const ds = `${y}-${m}-${d}`
      const e = await db.entries.where('date').equals(ds).first()
      if (e && e.mood > 0) {
        results.push({ year: y, mood: e.mood, journal: e.journal, date: ds })
      }
    }
    setPastEntries(results)
  }, [])

  useEffect(() => {
    setCurrentDate(dateParam || today)
  }, [dateParam, today])

  useEffect(() => {
    loadEntry(currentDate)
    loadOnThisDay(currentDate)
  }, [currentDate, loadEntry, loadOnThisDay])

  useEffect(() => {
    if (isToday) loadStreak()
  }, [isToday, loadStreak])

  // Auto-advance to today at midnight when viewing today
  useEffect(() => {
    if (dateParam) return
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const ms = midnight.getTime() - now.getTime()
    const timer = setTimeout(() => setCurrentDate(formatDate(new Date())), ms + 1000)
    return () => clearTimeout(timer)
  }, [dateParam, currentDate])

  const changeDay = (delta: number) => {
    const d = parseDate(currentDate)
    d.setDate(d.getDate() + delta)
    const newDate = formatDate(d)
    if (newDate === today) {
      setSearchParams({})
    } else {
      setSearchParams({ date: newDate })
    }
  }

  const updateMood = async (mood: number) => {
    if (!entry?.id) return
    await db.entries.update(entry.id, { mood, updatedAt: new Date() })
    setEntry({ ...entry, mood, updatedAt: new Date() })
    if (isToday) loadStreak()
  }

  const dateObj = parseDate(currentDate)
  const greeting = getGreeting()

  return (
    <div className="max-w-lg mx-auto px-5 pt-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => changeDay(-1)} className="p-2 -ml-2 text-[#b8a99a] hover:text-[#8b7e74] transition-colors">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          {isToday && (
            <p className="text-sm text-[#b8a99a] mb-0.5">
              {greeting.emoji} {greeting.text}
            </p>
          )}
          <h1 className={`${isToday ? 'text-xl' : 'text-lg'} font-bold text-[#3d3535] tracking-tight font-serif`}>
            {formatDisplay(dateObj)}
          </h1>
          {isToday && streak > 0 && (
            <p className="text-xs text-[#c97d6b] mt-1 font-medium">
              🔥 连续记录 {streak} 天
            </p>
          )}
        </div>
        <button
          onClick={() => changeDay(1)}
          className={`p-2 -mr-2 ${isToday ? 'invisible' : ''} text-[#b8a99a] hover:text-[#8b7e74] transition-colors`}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {entry && (
        <div className="space-y-4">
          <MoodPicker value={entry.mood} onChange={updateMood} />
          <JournalSection entryId={entry.id!} initialText={entry.journal} />
          <ExpenseSection date={currentDate} />

          {/* On This Day */}
          {isToday && pastEntries.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-[#b8a99a]" />
                <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider">那年今日</h3>
              </div>
              <div className="space-y-3">
                {pastEntries.map(pe => (
                  <button
                    key={pe.year}
                    onClick={() => setSearchParams({ date: pe.date })}
                    className="w-full text-left block"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[#c97d6b]">{pe.year}年</span>
                      <span className="text-sm">{MOOD_EMOJIS[pe.mood] || ''}</span>
                    </div>
                    {pe.journal && (
                      <p className="text-sm text-[#8b7e74] font-serif leading-relaxed line-clamp-2">
                        {pe.journal.slice(0, 120)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
