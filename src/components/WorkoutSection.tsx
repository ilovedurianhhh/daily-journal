import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { db, type Workout } from '../db'

const types: Record<string, { emoji: string; label: string }> = {
  strength: { emoji: '🏋️', label: '力量' },
  cardio: { emoji: '🏃', label: '有氧' },
  flexibility: { emoji: '🧘', label: '柔韧' },
  sports: { emoji: '⚽', label: '球类' },
  other: { emoji: '📌', label: '其他' },
}

interface Props {
  entryId: number
}

export default function WorkoutSection({ entryId }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('strength')
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    db.workouts.where('entryId').equals(entryId).toArray().then(setWorkouts)
  }, [entryId])

  const addWorkout = async () => {
    if (!exerciseName.trim()) return
    await db.workouts.add({
      entryId,
      type: type as Workout['type'],
      exerciseName: exerciseName.trim(),
      sets: sets ? Number(sets) : undefined,
      reps: reps ? Number(reps) : undefined,
      weightKg: weight ? Number(weight) : undefined,
      durationMinutes: duration ? Number(duration) : undefined,
      notes: notes.trim(),
      createdAt: new Date(),
    })
    setExerciseName(''); setSets(''); setReps(''); setWeight(''); setDuration(''); setNotes('')
    setShowForm(false)
    const list = await db.workouts.where('entryId').equals(entryId).toArray()
    setWorkouts(list)
  }

  const deleteWorkout = async (id: number) => {
    await db.workouts.delete(id)
    setWorkouts(workouts.filter(w => w.id !== id))
  }

  const isStrength = type === 'strength'
  const typeEntries = Object.entries(types)

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">健身日记</h2>
        <button onClick={() => setShowForm(!showForm)} className="text-indigo-400 p-1">
          <Plus size={20} />
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-4 mb-3 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {typeEntries.map(([key, { emoji, label }]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={`px-3 py-1 rounded-full text-sm ${
                  type === key ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="动作名称"
            value={exerciseName}
            onChange={e => setExerciseName(e.target.value)}
            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
          {isStrength ? (
            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder="组数" value={sets} onChange={e => setSets(e.target.value)}
                className="bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none" />
              <input type="number" placeholder="次数" value={reps} onChange={e => setReps(e.target.value)}
                className="bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none" />
              <input type="number" placeholder="重量(kg)" value={weight} onChange={e => setWeight(e.target.value)}
                className="bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none" />
            </div>
          ) : (
            <input type="number" placeholder="时长（分钟）" value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none" />
          )}
          <input type="text" placeholder="备注（可选）" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none" />
          <button
            onClick={addWorkout}
            disabled={!exerciseName.trim()}
            className="w-full py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            添加
          </button>
        </div>
      )}

      {workouts.length === 0 && !showForm && (
        <p className="text-slate-600 text-sm py-4 text-center">暂无记录，点击 + 添加</p>
      )}

      <div className="space-y-2">
        {workouts.map(w => {
          const t = types[w.type]
          return (
            <div key={w.id} className="bg-slate-800/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span>{t.emoji}</span>
                <span className="text-sm font-medium text-slate-200">{w.exerciseName}</span>
                <span className="text-xs text-slate-500">{t.label}</span>
                <button onClick={() => deleteWorkout(w.id!)} className="ml-auto text-slate-600 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-slate-400">
                {w.sets && w.reps && <span>{w.sets}组 × {w.reps}次{w.weightKg ? ` @ ${w.weightKg}kg` : ''}</span>}
                {w.durationMinutes && <span>{w.durationMinutes}分钟</span>}
                {w.notes && <span className="text-slate-500">📝 {w.notes}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
