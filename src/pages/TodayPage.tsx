import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { db, type Entry } from '../db'
import MoodPicker from '../components/MoodPicker'
import ActivitySection from '../components/ActivitySection'
import WorkoutSection from '../components/WorkoutSection'
import JournalSection from '../components/JournalSection'
import ImageGallery from '../components/ImageGallery'

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

export default function TodayPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const today = formatDate(new Date())
  const [currentDate, setCurrentDate] = useState(dateParam || today)
  const [entry, setEntry] = useState<Entry | null>(null)
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

  useEffect(() => {
    setCurrentDate(dateParam || today)
  }, [dateParam, today])

  useEffect(() => {
    loadEntry(currentDate)
  }, [currentDate, loadEntry])

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
  }

  const dateObj = parseDate(currentDate)
  const greeting = getGreeting()

  return (
    <div className="max-w-lg mx-auto px-5 pt-8">
      {/* Header */}
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
          <ActivitySection entryId={entry.id!} />
          <WorkoutSection entryId={entry.id!} />
          <JournalSection entryId={entry.id!} initialText={entry.journal} />
          <ImageGallery entryId={entry.id!} />
        </div>
      )}
    </div>
  )
}
