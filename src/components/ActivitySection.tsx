import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { db, type Activity } from '../db'

const categories: Record<string, { emoji: string; label: string }> = {
  work: { emoji: '💼', label: '工作' },
  study: { emoji: '📚', label: '学习' },
  exercise: { emoji: '🏃', label: '运动' },
  leisure: { emoji: '🎮', label: '休闲' },
  social: { emoji: '👥', label: '社交' },
  other: { emoji: '📌', label: '其他' },
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
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">今日活动</h2>
        <button onClick={() => setShowForm(!showForm)} className="text-indigo-400 p-1">
          <Plus size={20} />
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-4 mb-3 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {entries.map(([key, { emoji, label }]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`px-3 py-1 rounded-full text-sm ${
                  category === key ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
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
            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="时长（分钟）"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none"
            />
            <button
              onClick={addActivity}
              disabled={!description.trim()}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {activities.length === 0 && !showForm && (
        <p className="text-slate-600 text-sm py-4 text-center">暂无记录，点击 + 添加</p>
      )}

      <div className="space-y-2">
        {activities.map(a => {
          const cat = categories[a.category]
          return (
            <div key={a.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2">
              <span className="text-lg">{cat.emoji}</span>
              <span className="flex-1 text-sm text-slate-200">{a.description}</span>
              {a.durationMinutes && (
                <span className="text-xs text-slate-500">{a.durationMinutes}分钟</span>
              )}
              <button onClick={() => deleteActivity(a.id!)} className="text-slate-600 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
