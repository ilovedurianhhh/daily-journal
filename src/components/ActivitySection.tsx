import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { db, type Activity } from '../db'

const categories: Record<string, { emoji: string; label: string; color: string }> = {
  work: { emoji: '💼', label: '工作', color: '#c97d6b' },
  study: { emoji: '📚', label: '学习', color: '#8b7e74' },
  exercise: { emoji: '🏃', label: '运动', color: '#6db37a' },
  leisure: { emoji: '🎮', label: '休闲', color: '#b8a99a' },
  social: { emoji: '👥', label: '社交', color: '#d4a76a' },
  other: { emoji: '📌', label: '其他', color: '#a89bb8' },
}

interface Props {
  entryId: number
}

export default function ActivitySection({ entryId }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('work')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')

  useEffect(() => {
    db.activities.where('entryId').equals(entryId).toArray().then(setActivities)
  }, [entryId])

  const addActivity = async () => {
    if (!description.trim()) return
    await db.activities.add({
      entryId,
      category: category as Activity['category'],
      description: description.trim(),
      durationMinutes: duration ? Number(duration) : undefined,
      createdAt: new Date(),
    })
    setDescription('')
    setDuration('')
    setShowForm(false)
    const list = await db.activities.where('entryId').equals(entryId).toArray()
    setActivities(list)
  }

  const deleteActivity = async (id: number) => {
    await db.activities.delete(id)
    setActivities(activities.filter(a => a.id !== id))
  }

  const entries = Object.entries(categories)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider">今日活动</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`p-1.5 rounded-lg transition-all ${showForm ? 'bg-[#f8ede8] text-[#c97d6b] rotate-45' : 'text-[#b8a99a] hover:text-[#8b7e74]'}`}
        >
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {showForm && (
        <div className="bg-[#faf8f5] rounded-xl p-4 mb-3 space-y-3 border border-[#efe8e0]">
          <div className="flex gap-1.5 flex-wrap">
            {entries.map(([key, { emoji, label }]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  category === key
                    ? 'bg-white text-[#c97d6b] shadow-sm border border-[#efe8e0]'
                    : 'text-[#8b7e74] hover:bg-white/60'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="做了什么？"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-white rounded-lg px-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="时长（分钟）"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="flex-1 bg-white rounded-lg px-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors"
            />
            <button
              onClick={addActivity}
              disabled={!description.trim()}
              className="px-4 py-2.5 bg-[#c97d6b] text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {activities.length === 0 && !showForm && (
        <p className="text-sm text-[#d4cbc2] py-3 text-center font-serif italic">记录今天做过的事</p>
      )}

      <div className="space-y-1.5">
        {activities.map(a => {
          const cat = categories[a.category]
          return (
            <div key={a.id} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[#faf8f5] group transition-colors">
              <span className="text-lg">{cat.emoji}</span>
              <span className="flex-1 text-sm text-[#3d3535]">{a.description}</span>
              {a.durationMinutes && (
                <span className="text-xs text-[#b8a99a]">{a.durationMinutes}分钟</span>
              )}
              <button
                onClick={() => deleteActivity(a.id!)}
                className="opacity-0 group-hover:opacity-100 text-[#d4cbc2] hover:text-[#c97d6b] transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
