import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { db, type Exercise, type ExerciseSet, type ExerciseImage } from '../db'

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

const typeConfig: Record<string, { emoji: string; label: string }> = {
  strength: { emoji: '🏋️', label: '力量' },
  cardio: { emoji: '🏃', label: '有氧' },
}

export default function FitnessPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const today = formatDate(new Date())
  const [currentDate, setCurrentDate] = useState(dateParam || today)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [type, setType] = useState<'strength' | 'cardio'>('strength')
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState<ExerciseSet[]>([{ weightKg: undefined, reps: undefined }])
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [notes, setNotes] = useState('')
  const [formFiles, setFormFiles] = useState<File[]>([])

  // Image viewer state
  const [imageMap, setImageMap] = useState<Map<number, { imgs: ExerciseImage[]; urls: string[] }>>(new Map())
  const [viewingUrl, setViewingUrl] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const imageMapRef = useRef<Map<number, { imgs: ExerciseImage[]; urls: string[] }>>(new Map())
  const isToday = currentDate === today

  const loadExercises = useCallback(async (date: string) => {
    const exs = await db.exercises.where('date').equals(date).toArray()
    exs.sort((a, b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0))
    setExercises(exs)

    // Revoke old URLs before creating new ones
    imageMapRef.current.forEach(v => v.urls.forEach(URL.revokeObjectURL))
    const map = new Map<number, { imgs: ExerciseImage[]; urls: string[] }>()
    for (const ex of exs) {
      if (ex.id == null) continue
      const imgs = await db.exerciseImages.where('exerciseId').equals(ex.id).toArray()
      const urls = imgs.map(i => URL.createObjectURL(i.data))
      map.set(ex.id, { imgs, urls })
    }
    imageMapRef.current = map
    setImageMap(new Map(map))
  }, [])

  useEffect(() => {
    setCurrentDate(dateParam || today)
  }, [dateParam, today])

  useEffect(() => {
    loadExercises(currentDate)
    return () => {
      imageMapRef.current.forEach(v => v.urls.forEach(URL.revokeObjectURL))
    }
  }, [currentDate, loadExercises])

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
    if (newDate === today) setSearchParams({})
    else setSearchParams({ date: newDate })
  }

  const addSet = () => setSets([...sets, { weightKg: undefined, reps: undefined }])
  const removeSet = (i: number) => {
    if (sets.length <= 1) return
    setSets(sets.filter((_, idx) => idx !== i))
  }
  const updateSet = (i: number, field: 'weightKg' | 'reps', value: string) => {
    const updated = [...sets]
    updated[i] = { ...updated[i], [field]: value ? Number(value) : undefined }
    setSets(updated)
  }

  const handleFormFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormFiles(prev => [...prev, ...files])
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeFormFile = (i: number) => setFormFiles(formFiles.filter((_, idx) => idx !== i))

  const addExercise = async () => {
    if (!exerciseName.trim()) return
    if (type === 'strength') {
      const validSets = sets.filter(s => s.weightKg || s.reps)
      if (validSets.length === 0) return
      const id = await db.exercises.add({
        date: currentDate,
        type: 'strength',
        exerciseName: exerciseName.trim(),
        sets: validSets,
        notes: notes.trim(),
        createdAt: new Date(),
      })
      await saveExerciseImages(id, formFiles)
    } else {
      await db.exercises.add({
        date: currentDate,
        type: 'cardio',
        exerciseName: exerciseName.trim(),
        sets: [{
          durationMinutes: duration ? Number(duration) : undefined,
          distanceKm: distance ? Number(distance) : undefined,
        }],
        notes: notes.trim(),
        createdAt: new Date(),
      })
    }

    // Reset form
    setExerciseName(''); setSets([{ weightKg: undefined, reps: undefined }])
    setDuration(''); setDistance(''); setNotes(''); setFormFiles([]); setShowForm(false)
    await loadExercises(currentDate)
  }

  const deleteExercise = async (id: number) => {
    const entry = imageMapRef.current.get(id)
    if (entry) {
      entry.urls.forEach(URL.revokeObjectURL)
      imageMapRef.current.delete(id)
      for (const img of entry.imgs) {
        if (img.id != null) await db.exerciseImages.delete(img.id)
      }
    }
    await db.exercises.delete(id)
    setViewingUrl(null)
    await loadExercises(currentDate)
  }

  const dateObj = parseDate(currentDate)

  return (
    <div className="max-w-lg mx-auto px-5 pt-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => changeDay(-1)} className="p-2 -ml-2 text-[#b8a99a] dark:text-slate-400 hover:text-[#8b7e74] transition-colors">
          <ChevronLeft size={22} />
        </button>
        <h1 className={`${isToday ? 'text-xl' : 'text-lg'} font-bold text-[#3d3535] dark:text-slate-100 tracking-tight font-serif`}>
          {formatDisplay(dateObj)}
        </h1>
        <button
          onClick={() => changeDay(1)}
          className={`p-2 -mr-2 ${isToday ? 'invisible' : ''} text-[#b8a99a] dark:text-slate-400 hover:text-[#8b7e74] transition-colors`}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Add button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full card p-4 flex items-center justify-center gap-2 text-[#b8a99a] dark:text-slate-400 hover:text-[#c97d6b] dark:text-rose-400 hover:border-[#c97d6b]/30 transition-all"
          >
            <Plus size={18} strokeWidth={2} />
            <span className="text-sm">添加训练</span>
          </button>
        )}

        {/* Add form */}
        {showForm && (
          <div className="card p-5 space-y-3">
            <div className="flex gap-2">
              {Object.entries(typeConfig).map(([key, { emoji, label }]) => (
                <button
                  key={key}
                  onClick={() => setType(key as 'strength' | 'cardio')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    type === key
                      ? 'bg-[#f8ede8] text-[#c97d6b] dark:text-rose-400'
                      : 'bg-[#faf8f5] dark:bg-slate-800 text-[#8b7e74]'
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
              className="w-full bg-[#faf8f5] dark:bg-slate-800 rounded-lg px-3 py-2.5 text-sm text-[#3d3535] dark:text-slate-100 placeholder-[#d4cbc2] outline-none border border-[#efe8e0] dark:border-slate-700 focus:border-[#c97d6b]/30"
            />

            {type === 'strength' ? (
              <div className="space-y-2">
                <div className="text-xs text-[#b8a99a] dark:text-slate-400 font-medium">每组重量与次数</div>
                {sets.map((set, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-[#b8a99a] dark:text-slate-400 w-6">#{i + 1}</span>
                    <input
                      type="number"
                      placeholder="重量 kg"
                      value={set.weightKg ?? ''}
                      onChange={e => updateSet(i, 'weightKg', e.target.value)}
                      className="flex-1 bg-[#faf8f5] dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-[#3d3535] dark:text-slate-100 placeholder-[#d4cbc2] outline-none border border-[#efe8e0] dark:border-slate-700 focus:border-[#c97d6b]/30"
                    />
                    <input
                      type="number"
                      placeholder="次数"
                      value={set.reps ?? ''}
                      onChange={e => updateSet(i, 'reps', e.target.value)}
                      className="w-20 bg-[#faf8f5] dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-[#3d3535] dark:text-slate-100 placeholder-[#d4cbc2] outline-none border border-[#efe8e0] dark:border-slate-700 focus:border-[#c97d6b]/30"
                    />
                    {sets.length > 1 && (
                      <button onClick={() => removeSet(i)} className="p-1 text-[#d4cbc2] active:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addSet}
                  className="text-xs text-[#c97d6b] dark:text-rose-400 hover:text-[#b07d6b] font-medium"
                >
                  + 添加一组
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="时长（分钟）"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="flex-1 bg-[#faf8f5] dark:bg-slate-800 rounded-lg px-3 py-2.5 text-sm text-[#3d3535] dark:text-slate-100 placeholder-[#d4cbc2] outline-none border border-[#efe8e0] dark:border-slate-700 focus:border-[#c97d6b]/30"
                />
                <input
                  type="number"
                  placeholder="距离（km）"
                  value={distance}
                  onChange={e => setDistance(e.target.value)}
                  className="w-28 bg-[#faf8f5] dark:bg-slate-800 rounded-lg px-3 py-2.5 text-sm text-[#3d3535] dark:text-slate-100 placeholder-[#d4cbc2] outline-none border border-[#efe8e0] dark:border-slate-700 focus:border-[#c97d6b]/30"
                />
              </div>
            )}

            <input
              type="text"
              placeholder="备注（可选）"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#faf8f5] dark:bg-slate-800 rounded-lg px-3 py-2.5 text-sm text-[#3d3535] dark:text-slate-100 placeholder-[#d4cbc2] outline-none border border-[#efe8e0] dark:border-slate-700 focus:border-[#c97d6b]/30"
            />

            {/* Form image picker */}
            <div>
              {formFiles.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {formFiles.map((file, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#f5f0eb] dark:bg-slate-700">
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="w-full h-full object-cover"
                        onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                      />
                      <button
                        onClick={() => removeFormFile(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFormFiles} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-[#b8a99a] dark:text-slate-400 hover:text-[#c97d6b] dark:text-rose-400 transition-colors"
              >
                + 添加照片
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm text-[#8b7e74] bg-[#faf8f5] dark:bg-slate-800 rounded-lg font-medium"
              >
                取消
              </button>
              <button
                onClick={addExercise}
                disabled={!exerciseName.trim()}
                className="flex-1 py-2.5 bg-[#c97d6b] text-white rounded-lg text-sm font-medium disabled:opacity-40"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* Exercise list */}
        {exercises.map(ex => {
          const tc = typeConfig[ex.type]
          const imgData = ex.id != null ? imageMap.get(ex.id) : undefined
          return (
            <div key={ex.id} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{tc.emoji}</span>
                <span className="text-sm font-medium text-[#3d3535] dark:text-slate-100">{ex.exerciseName}</span>
                <span className="text-xs text-[#b8a99a] dark:text-slate-400 bg-[#f5f0eb] dark:bg-slate-700 px-1.5 py-0.5 rounded">{tc.label}</span>
                <button
                  onClick={() => ex.id != null && deleteExercise(ex.id)}
                  className="ml-auto text-[#d4cbc2] active:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {ex.type === 'strength' ? (
                <div className="mb-2">
                  <div className="grid grid-cols-3 gap-1 text-xs text-[#b8a99a] dark:text-slate-400 mb-1 px-1">
                    <span>组</span><span>重量</span><span>次数</span>
                  </div>
                  {ex.sets.map((set, i) => (
                    <div key={i} className="grid grid-cols-3 gap-1 text-sm px-1 py-0.5">
                      <span className="text-[#b8a99a] dark:text-slate-400">#{i + 1}</span>
                      <span className="text-[#3d3535] dark:text-slate-100">{set.weightKg ? `${set.weightKg}kg` : '-'}</span>
                      <span className="text-[#3d3535] dark:text-slate-100">{set.reps ?? '-'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 text-sm text-[#3d3535] dark:text-slate-100 mb-2">
                  {ex.sets[0]?.durationMinutes && (
                    <span>⏱️ {ex.sets[0].durationMinutes}分钟</span>
                  )}
                  {ex.sets[0]?.distanceKm && (
                    <span>📍 {ex.sets[0].distanceKm}km</span>
                  )}
                </div>
              )}

              {ex.notes && (
                <p className="text-xs text-[#8b7e74] mb-2">📝 {ex.notes}</p>
              )}

              {imgData && imgData.imgs.length > 0 && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-[#efe8e0] dark:border-slate-700">
                  {imgData.imgs.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setViewingUrl(imgData.urls[i])}
                      className="w-16 h-16 rounded-lg overflow-hidden bg-[#f5f0eb] dark:bg-slate-700 flex-shrink-0"
                    >
                      <img src={imgData.urls[i]} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {exercises.length === 0 && !showForm && (
          <p className="text-sm text-[#d4cbc2] text-center py-8 font-serif italic">暂无训练记录</p>
        )}
      </div>

      {/* Fullscreen viewer */}
      {viewingUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setViewingUrl(null)}>
          <button onClick={() => setViewingUrl(null)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10">
            <X size={24} />
          </button>
          <img src={viewingUrl} alt="" className="max-w-full max-h-full object-contain p-4" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

async function saveExerciseImages(exerciseId: number, files: File[]) {
  for (const file of files) {
    const resized = await resizeImage(file)
    await db.exerciseImages.add({ exerciseId, data: resized, createdAt: new Date() })
  }
}

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const maxDim = 1920
      let { width, height } = img
      if (width <= maxDim && height <= maxDim) { resolve(file); return }
      if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim }
      else { width = Math.round(width * (maxDim / height)); height = maxDim }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(img.src)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to resize'))
      }, file.type || 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Failed to load image')) }
    img.src = URL.createObjectURL(file)
  })
}
