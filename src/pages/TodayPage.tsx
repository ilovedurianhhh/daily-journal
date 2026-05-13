import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { db, type Entry } from '../db'
import MoodPicker from '../components/MoodPicker'
import ActivitySection from '../components/ActivitySection'
import WorkoutSection from '../components/WorkoutSection'
import JournalSection from '../components/JournalSection'

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
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 周${weekdays[date.getDay()]}`
}

export default function TodayPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const today = formatDate(new Date())
  const [currentDate, setCurrentDate] = useState(dateParam || today)
  const [entry, setEntry] = useState<Entry | null>(null)

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

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => changeDay(-1)} className="p-2 text-slate-400 hover:text-slate-200">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-slate-200">{formatDisplay(dateObj)}</h1>
        <button
          onClick={() => changeDay(1)}
          className={`p-2 ${currentDate === today ? 'invisible' : ''} text-slate-400 hover:text-slate-200`}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {entry && (
        <>
          <MoodPicker value={entry.mood} onChange={updateMood} />
          <ActivitySection entryId={entry.id!} />
          <WorkoutSection entryId={entry.id!} />
          <JournalSection entryId={entry.id!} initialText={entry.journal} />
        </>
      )}
    </div>
  )
}
