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
  work: '工作', study: '学习', exercise: '运动',
  leisure: '休闲', social: '社交', other: '其他',
}

const CAT_EMOJIS: Record<string, string> = {
  work: '💼', study: '📚', exercise: '🏃',
  leisure: '🎮', social: '👥', other: '📌',
}

const PIE_COLORS = ['#c97d6b', '#6db37a', '#e8c76a', '#d4a76a', '#a89bb8', '#8b7e74']

export default function StatsPage() {
  const [moodData, setMoodData] = useState<{ date: string; mood: number; label: string }[]>([])
  const [activityCounts, setActivityCounts] = useState<{ name: string; value: number; emoji: string }[]>([])
  const [workoutStats, setWorkoutStats] = useState({
    total: 0, thisWeek: 0, topExercise: '-',
  })
  const [streak, setStreak] = useState(0)

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

      // Streak: count consecutive days (backwards from today) with mood > 0
      let s = 0
      const check = new Date(now)
      while (true) {
        const ds = formatDate(check)
        const e = moodMap.get(ds)
        if (e && e > 0) {
          s++
          check.setDate(check.getDate() - 1)
        } else {
          break
        }
      }
      setStreak(s)

      // Activity counts
      const allActs: Activity[] = await db.activities.toArray()
      const counts: Record<string, number> = {}
      for (const a of allActs) {
        counts[a.category] = (counts[a.category] || 0) + 1
      }
      setActivityCounts(
        Object.entries(counts).map(([k, v]) => ({
          name: CAT_LABELS[k] || k,
          value: v,
          emoji: CAT_EMOJIS[k] || '',
        }))
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
    <div className="max-w-lg mx-auto px-5 pt-8">
      <h1 className="text-xl font-bold text-[#3d3535] mb-8 font-serif">统计</h1>

      <div className="space-y-4">
        {/* Streak */}
        <div className="card p-5 text-center">
          <p className="text-xs text-[#b8a99a] uppercase tracking-wider mb-2">连续记录</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">🔥</span>
            <span className="text-4xl font-bold text-[#c97d6b] font-serif">{streak}</span>
            <span className="text-lg text-[#8b7e74]">天</span>
          </div>
        </div>

        {/* Mood trend */}
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider mb-4">心情趋势 · 近30天</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={moodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efe8e0" />
              <XAxis dataKey="date" tick={{ fill: '#b8a99a', fontSize: 10 }} interval={4} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#b8a99a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#fff', border: '1px solid #efe8e0', borderRadius: '12px',
                  color: '#3d3535', boxShadow: '0 2px 8px rgba(61,53,53,0.08)',
                }}
                formatter={(_value, _name, item) => {
                  const label = (item as { payload?: { label?: string } })?.payload?.label ?? ''
                  return [label, '心情'] as [string, string]
                }}
              />
              <Line type="monotone" dataKey="mood" stroke="#c97d6b" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#c97d6b' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activity breakdown */}
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider mb-4">活动分布</h3>
          {activityCounts.length === 0 ? (
            <p className="text-sm text-[#d4cbc2] text-center py-8 font-serif italic">还没有活动记录</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie
                    data={activityCounts} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                  >
                    {activityCounts.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {activityCounts.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-[#8b7e74]">{item.emoji}</span>
                    <span className="text-[#3d3535] text-xs">{item.name}</span>
                    <span className="ml-auto text-xs text-[#b8a99a]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Workout summary */}
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider mb-4">健身概览</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#faf8f5] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-[#c97d6b] font-serif">{workoutStats.total}</div>
              <div className="text-xs text-[#b8a99a] mt-1">总计训练</div>
            </div>
            <div className="bg-[#faf8f5] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-[#6db37a] font-serif">{workoutStats.thisWeek}</div>
              <div className="text-xs text-[#b8a99a] mt-1">本周训练</div>
            </div>
            <div className="bg-[#faf8f5] rounded-xl p-3 text-center">
              <div className="text-xs font-medium text-[#3d3535] truncate">{workoutStats.topExercise}</div>
              <div className="text-xs text-[#b8a99a] mt-1">最多训练</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
