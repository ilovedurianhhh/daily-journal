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
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider">健身日记</h3>
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
            {typeEntries.map(([key, { emoji, label }]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  type === key
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
            placeholder="动作名称"
            value={exerciseName}
            onChange={e => setExerciseName(e.target.value)}
            className="w-full bg-white rounded-lg px-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors"
          />
          {isStrength ? (
            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder="组数" value={sets} onChange={e => setSets(e.target.value)}
                className="bg-white rounded-lg px-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors" />
              <input type="number" placeholder="次数" value={reps} onChange={e => setReps(e.target.value)}
                className="bg-white rounded-lg px-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors" />
              <input type="number" placeholder="重量(kg)" value={weight} onChange={e => setWeight(e.target.value)}
                className="bg-white rounded-lg px-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors" />
            </div>
          ) : (
            <input type="number" placeholder="时长（分钟）" value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full bg-white rounded-lg px-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors" />
          )}
          <input type="text" placeholder="备注（可选）" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full bg-white rounded-lg px-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors" />
          <button
            onClick={addWorkout}
            disabled={!exerciseName.trim()}
            className="w-full py-2.5 bg-[#c97d6b] text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            添加训练
          </button>
        </div>
      )}

      {workouts.length === 0 && !showForm && (
        <p className="text-sm text-[#d4cbc2] py-3 text-center font-serif italic">记录今天的训练</p>
      )}

      <div className="space-y-1.5">
        {workouts.map(w => {
          const t = types[w.type]
          return (
            <div key={w.id} className="py-2 px-2 -mx-2 rounded-lg hover:bg-[#faf8f5] group transition-colors">
              <div className="flex items-center gap-2">
                <span>{t.emoji}</span>
                <span className="text-sm font-medium text-[#3d3535]">{w.exerciseName}</span>
                <span className="text-xs text-[#b8a99a] bg-[#f5f0eb] px-1.5 py-0.5 rounded">{t.label}</span>
                <button
                  onClick={() => deleteWorkout(w.id!)}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-[#d4cbc2] hover:text-[#c97d6b] transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-[#8b7e74]">
                {w.sets && w.reps && <span>{w.sets}组 × {w.reps}次{w.weightKg ? ` · ${w.weightKg}kg` : ''}</span>}
                {w.durationMinutes && <span>{w.durationMinutes}分钟</span>}
                {w.notes && <span className="text-[#b8a99a]">📝 {w.notes}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
