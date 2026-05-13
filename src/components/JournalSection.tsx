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
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider">日记</h3>
        {saved && <span className="text-xs text-[#6db37a] transition-opacity">已保存 ✓</span>}
      </div>
      <textarea
        value={text}
        onChange={e => onChange(e.target.value)}
        placeholder="今天发生了什么？写点什么..."
        rows={6}
        className="w-full bg-transparent text-[15px] text-[#3d3535] placeholder-[#d4cbc2] outline-none resize-none font-serif leading-relaxed"
      />
    </div>
  )
}
