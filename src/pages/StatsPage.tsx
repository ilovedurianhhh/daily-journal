import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { db, type Exercise } from '../db'
import ReportCard from '../components/ReportCard'
import { exportAll, importAll, downloadFile, exportMarkdown } from '../services/backup'
import { Download, Upload, Moon, Sun, FileText, Bell, BellOff } from 'lucide-react'

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
  food: '餐饮', transport: '交通', shopping: '购物',
  entertainment: '娱乐', home: '居家',
}
const CAT_EMOJIS: Record<string, string> = {
  work: '💼', study: '📚', exercise: '🏃',
  leisure: '🎮', social: '👥', other: '📌',
  food: '🍜', transport: '🚗', shopping: '🛒',
  entertainment: '🎬', home: '🏠',
}
const PIE_COLORS = ['#c97d6b', '#6db37a', '#e8c76a', '#d4a76a', '#a89bb8', '#8b7e74']

export default function StatsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('darkMode', String(next))
  }

  const [notify, setNotify] = useState(() => localStorage.getItem('notifyEnabled') === 'true')

  const toggleNotify = async () => {
    if (!notify) {
      if (!('Notification' in window)) { alert('浏览器不支持通知'); return }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { alert('需要允许通知权限'); return }
    }
    const next = !notify
    setNotify(next)
    localStorage.setItem('notifyEnabled', String(next))
    if (next) scheduleReminder()
  }

  const scheduleReminder = () => {
    const now = new Date()
    const target = new Date(now)
    target.setHours(21, 0, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    const ms = target.getTime() - now.getTime()
    setTimeout(() => {
      if (localStorage.getItem('notifyEnabled') === 'true') {
        new Notification('📝 今天过得怎么样？', { body: '来记录今天的心情和故事吧 ✨', icon: '/icon-192.png' })
        scheduleReminder()
      }
    }, ms)
  }

  useEffect(() => {
    if (notify) scheduleReminder()
  }, [])

  const [moodData, setMoodData] = useState<{ date: string; mood: number; label: string }[]>([])
  const [expenseCounts, setExpenseCounts] = useState<{ name: string; value: number; emoji: string }[]>([])
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [fitnessStats, setFitnessStats] = useState({
    totalWorkouts: 0, thisWeek: 0, totalSets: 0,
  })
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    (async () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - 29)
      const startStr = formatDate(start)
      const endStr = formatDate(now)

      // Mood data
      const entries = await db.entries.where('date').between(startStr, endStr, true, true).toArray()
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

      // Streak
      let s = 0
      const check = new Date(now)
      while (true) {
        const ds = formatDate(check)
        const e = moodMap.get(ds)
        if (e && e > 0) { s++; check.setDate(check.getDate() - 1) }
        else break
      }
      setStreak(s)

      // Expense stats (last 30 days)
      const expenses = await db.expenses.where('date').between(startStr, endStr, true, true).toArray()
      setExpenseTotal(expenses.reduce((sum, e) => sum + e.amount, 0))
      const catCounts: Record<string, number> = {}
      for (const e of expenses) {
        catCounts[e.category] = (catCounts[e.category] || 0) + e.amount
      }
      setExpenseCounts(
        Object.entries(catCounts)
          .map(([k, v]) => ({ name: CAT_LABELS[k] || k, value: v, emoji: CAT_EMOJIS[k] || '' }))
          .sort((a, b) => b.value - a.value)
      )

      // Fitness stats
      const allExs: Exercise[] = await db.exercises.toArray()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const thisWeek = await db.exercises
        .where('date').between(formatDate(weekStart), endStr, true, true).count()
      let totalSets = 0
      for (const ex of allExs) {
        totalSets += ex.sets.length
      }
      setFitnessStats({
        totalWorkouts: allExs.length,
        thisWeek,
        totalSets,
      })
    })()
  }, [])

  return (
    <div className="max-w-lg mx-auto px-5 pt-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-[#3d3535] font-serif">统计</h1>
        <div className="flex gap-1">
          <button
            onClick={async () => {
              try {
                const json = await exportAll()
                downloadFile(json, `journal-backup-${formatDate(new Date())}.json`)
              } catch (e) { alert('导出失败: ' + e) }
            }}
            className="p-2 text-[#b8a99a] hover:text-[#c97d6b] transition-colors"
            title="导出备份"
          >
            <Download size={18} />
          </button>
          <button
            onClick={async () => {
              try {
                const md = await exportMarkdown()
                downloadFile(md, `journal-${formatDate(new Date())}.md`, 'text/markdown')
              } catch (e) { alert('导出失败: ' + e) }
            }}
            className="p-2 text-[#b8a99a] dark:text-slate-400 hover:text-[#c97d6b] dark:hover:text-rose-400 transition-colors"
            title="导出 Markdown"
          >
            <FileText size={18} />
          </button>
          <button
            onClick={toggleNotify}
            className={`p-2 transition-colors ${notify ? 'text-[#c97d6b] dark:text-rose-400' : 'text-[#b8a99a] dark:text-slate-400 hover:text-[#c97d6b] dark:hover:text-rose-400'}`}
            title={notify ? '已开启每日提醒' : '开启每日提醒'}
          >
            {notify ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          <button
            onClick={async () => {
              try {
                const json = await exportAll()
                downloadFile(json, `journal-backup-${formatDate(new Date())}.json`)
              } catch (e) { alert('导出失败: ' + e) }
            }}
            className="p-2 text-[#b8a99a] dark:text-slate-400 hover:text-[#c97d6b] dark:hover:text-rose-400 transition-colors"
            title="导出备份"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-[#b8a99a] dark:text-slate-400 hover:text-[#c97d6b] dark:hover:text-rose-400 transition-colors"
            title="导入备份"
          >
            <Upload size={18} />
          </button>
          <button
            onClick={toggleDark}
            className="p-2 text-[#b8a99a] dark:text-slate-400 hover:text-[#c97d6b] dark:hover:text-rose-400 transition-colors"
            title={dark ? '浅色模式' : '深色模式'}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (!confirm('导入将覆盖当前所有数据，确定继续？')) {
                if (fileInputRef.current) fileInputRef.current.value = ''
                return
              }
              try {
                const text = await file.text()
                await importAll(text)
                alert('导入成功！页面将刷新。')
                window.location.reload()
              } catch (e) { alert('导入失败: ' + e) }
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="hidden"
          />
        </div>
      </div>

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
                contentStyle={{ background: '#fff', border: '1px solid #efe8e0', borderRadius: '12px', color: '#3d3535', boxShadow: '0 2px 8px rgba(61,53,53,0.08)' }}
                formatter={(_value, _name, item) => {
                  const label = (item as { payload?: { label?: string } })?.payload?.label ?? ''
                  return [label, '心情'] as [string, string]
                }}
              />
              <Line type="monotone" dataKey="mood" stroke="#c97d6b" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#c97d6b' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense breakdown */}
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider mb-1">消费分布 · 近30天</h3>
          <p className="text-sm text-[#8b7e74] mb-4">
            共 <span className="font-bold text-[#c97d6b] font-serif">¥{expenseTotal}</span>
          </p>
          {expenseCounts.length === 0 ? (
            <p className="text-sm text-[#d4cbc2] text-center py-6 font-serif italic">暂无消费记录</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={expenseCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {expenseCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(_v) => [`¥${_v}`, '金额']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {expenseCounts.slice(0, 6).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-[#8b7e74] text-xs">{item.emoji}</span>
                    <span className="text-[#3d3535] text-xs">{item.name}</span>
                    <span className="ml-auto text-xs text-[#b8a99a]">¥{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fitness summary */}
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider mb-4">健身概览</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#faf8f5] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-[#c97d6b] font-serif">{fitnessStats.totalWorkouts}</div>
              <div className="text-xs text-[#b8a99a] mt-1">总训练数</div>
            </div>
            <div className="bg-[#faf8f5] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-[#6db37a] font-serif">{fitnessStats.thisWeek}</div>
              <div className="text-xs text-[#b8a99a] mt-1">本周训练</div>
            </div>
            <div className="bg-[#faf8f5] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-[#8b7e74] font-serif">{fitnessStats.totalSets}</div>
              <div className="text-xs text-[#b8a99a] mt-1">总组数</div>
            </div>
          </div>
        </div>

        <ReportCard />

        {/* Data management */}
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#b8a99a] dark:text-slate-400 uppercase tracking-wider mb-4">数据管理</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                try {
                  const md = await exportMarkdown()
                  downloadFile(md, `journal-${formatDate(new Date())}.md`, 'text/markdown')
                } catch (e) { alert('导出失败: ' + e) }
              }}
              className="flex items-center justify-center gap-2 py-3 bg-[#faf8f5] dark:bg-slate-800 rounded-xl text-sm font-medium text-[#3d3535] dark:text-slate-100 active:bg-[#f8ede8] dark:active:bg-rose-950 transition-colors"
            >
              <FileText size={16} />
              导出 Markdown
            </button>
            <button
              onClick={async () => {
                try {
                  const json = await exportAll()
                  downloadFile(json, `journal-backup-${formatDate(new Date())}.json`)
                } catch (e) { alert('导出失败: ' + e) }
              }}
              className="flex items-center justify-center gap-2 py-3 bg-[#faf8f5] dark:bg-slate-800 rounded-xl text-sm font-medium text-[#3d3535] dark:text-slate-100 active:bg-[#f8ede8] dark:active:bg-rose-950 transition-colors"
            >
              <Download size={16} />
              导出 JSON 备份
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 bg-[#faf8f5] dark:bg-slate-800 rounded-xl text-sm font-medium text-[#3d3535] dark:text-slate-100 active:bg-[#f8ede8] dark:active:bg-rose-950 transition-colors"
            >
              <Upload size={16} />
              导入 JSON 恢复
            </button>
            <button
              onClick={toggleNotify}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${
                notify
                  ? 'bg-[#f8ede8] dark:bg-rose-950 text-[#c97d6b] dark:text-rose-400'
                  : 'bg-[#faf8f5] dark:bg-slate-800 text-[#3d3535] dark:text-slate-100 active:bg-[#f8ede8] dark:active:bg-rose-950'
              }`}
            >
              {notify ? <Bell size={16} /> : <BellOff size={16} />}
              {notify ? '提醒已开启' : '每日提醒'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
