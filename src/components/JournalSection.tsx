import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '../db'

interface Props {
  entryId: number
  initialText: string
}

export default function JournalSection({ entryId, initialText }: Props) {
  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setText(initialText)
  }, [entryId, initialText])

  const save = useCallback(async (value: string) => {
    await db.entries.update(entryId, { journal: value, updatedAt: new Date() })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [entryId])

  const onChange = (value: string) => {
    setText(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(value), 800)
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">日记</h2>
        {saved && <span className="text-xs text-green-400">已保存</span>}
      </div>
      <textarea
        value={text}
        onChange={e => onChange(e.target.value)}
        placeholder="今天发生了什么？有什么想记录的..."
        rows={6}
        className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none resize-none"
      />
    </section>
  )
}
