import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { db, type Activity, type Workout } from '../db'

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const MOOD_LABELS: Record<number, string> = {
  5: '😄 很好', 4: '🙂 不错', 3: '😐 一般', 2: '😔 不太好', 1: '😢 很差',
}

const CAT_LABELS: Record<string, string> = {
  work: '💼 工作', study: '📚 学习', exercise: '🏃 运动',
  leisure: '🎮 休闲', social: '👥 社交', other: '📌 其他',
}

const PIE_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#a78bfa']

export default function StatsPage() {
  const [moodData, setMoodData] = useState<{ date: string; mood: number; label: string }[]>([])
  const [activityCounts, setActivityCounts] = useState<{ name: string; value: number }[]>([])
  const [workoutStats, setWorkoutStats] = useState({
    total: 0, thisWeek: 0, topExercise: '-',
  })

  useEffect(() => {
    (async () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - 29)
      const startStr = formatDate(start)
      const endStr = formatDate(now)

      const entries = await db.entries
        .where('date').between(startStr, endStr, true, true).toArray()
      const moodMap = new Map(entries.map(e => [e.date, e.mood]))
      const moodArr = []
      for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
        const ds = formatDate(d)
        const mood = moodMap.get(ds) || 0
        moodArr.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          mood,
          label: mood ? MOOD_LABELS[mood] : '无记录',
        })
      }
      setMoodData(moodArr)

      // Activity counts
      const allActs: Activity[] = await db.activities.toArray()
      const counts: Record<string, number> = {}
      for (const a of allActs) {
        counts[a.category] = (counts[a.category] || 0) + 1
      }
      setActivityCounts(
        Object.entries(counts).map(([k, v]) => ({ name: CAT_LABELS[k] || k, value: v }))
      )

      // Workout stats
      const allWkts: Workout[] = await db.workouts.toArray()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const thisWeekCount = await db.workouts
        .filter(w => (w.createdAt as Date) >= weekStart)
        .count()
      const nameCounts: Record<string, number> = {}
      for (const w of allWkts) {
        nameCounts[w.exerciseName] = (nameCounts[w.exerciseName] || 0) + 1
      }
      const top = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0]
      setWorkoutStats({
        total: allWkts.length,
        thisWeek: thisWeekCount,
        topExercise: top ? `${top[0]} (${top[1]}次)` : '-',
      })
    })()
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-lg font-medium text-slate-200 mb-6">统计</h1>

      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">心情趋势（近30天）</h2>
        <div className="bg-slate-800 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={moodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={4} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                formatter={(_value, _name, item) => {
                  const label = (item as { payload?: { label?: string } })?.payload?.label ?? ''
                  return [label, '心情'] as [string, string]
                }}
              />
              <Line type="monotone" dataKey="mood" stroke="#818cf8" strokeWidth={2} dot={{ r: 3, fill: '#818cf8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">活动分布</h2>
        <div className="bg-slate-800 rounded-xl p-4">
          {activityCounts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">暂无数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={activityCounts} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80}
                  label={({ name, value }) => `${name} ${value}`}
                >
                  {activityCounts.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">健身概览</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-indigo-400">{workoutStats.total}</div>
            <div className="text-xs text-slate-500 mt-1">总计训练</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{workoutStats.thisWeek}</div>
            <div className="text-xs text-slate-500 mt-1">本周训练</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-sm font-medium text-slate-200 truncate">{workoutStats.topExercise}</div>
            <div className="text-xs text-slate-500 mt-1">最多训练</div>
          </div>
        </div>
      </section>
    </div>
  )
}
