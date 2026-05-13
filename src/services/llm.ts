import { db } from '../db'

const API_URL = 'https://api.deepseek.com/v1/chat/completions'

const MOOD_LABELS: Record<number, string> = {
  5: '😄 很好', 4: '🙂 不错', 3: '😐 一般', 2: '😔 不太好', 1: '😢 很差',
}

interface ReportData {
  moodAvg: number
  moodTrend: string
  journalSnippets: string[]
  expenseTotal: number
  expenseBreakdown: string
  workoutCount: number
  topExercises: string
  totalSets: number
}

interface ReportResult {
  content: string
  moodAvg: number
  expenseTotal: number
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - ((dayOfWeek + 6) % 7)) // Monday
  const end = new Date(now)
  end.setDate(start.getDate() + 6) // Sunday
  return { start: fmt(start), end: fmt(end) }
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: fmt(start), end: fmt(end) }
}

function getYearRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear(), 11, 31)
  return { start: fmt(start), end: fmt(end) }
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateRange(periodStart: string, periodEnd: string): string {
  const s = new Date(periodStart + 'T00:00:00')
  const e = new Date(periodEnd + 'T00:00:00')
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`
}

async function gatherData(periodStart: string, periodEnd: string): Promise<ReportData> {
  const entries = await db.entries
    .where('date').between(periodStart, periodEnd, true, true)
    .toArray()

  const moods = entries.filter(e => e.mood > 0).map(e => e.mood)
  const moodAvg = moods.length > 0
    ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10
    : 0

  const moodCounts: Record<number, number> = {}
  moods.forEach(m => { moodCounts[m] = (moodCounts[m] || 0) + 1 })
  const moodTrend = Object.entries(moodCounts)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([k, v]) => `${MOOD_LABELS[Number(k)]} ${v}天`)
    .join('，')

  const journalSnippets = entries
    .filter(e => e.journal.trim())
    .map(e => {
      const date = new Date(e.date + 'T00:00:00')
      return `${date.getMonth() + 1}/${date.getDate()}: ${e.journal.slice(0, 150)}${e.journal.length > 150 ? '...' : ''}`
    })

  const expenses = await db.expenses
    .where('date').between(periodStart, periodEnd, true, true)
    .toArray()
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const catTotals: Record<string, number> = {}
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount })
  const expenseBreakdown = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ¥${v}`)
    .join('，') || '无消费记录'

  const exercises = await db.exercises
    .where('date').between(periodStart, periodEnd, true, true)
    .toArray()
  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0)
  const exNameCounts: Record<string, number> = {}
  exercises.forEach(e => { exNameCounts[e.exerciseName] = (exNameCounts[e.exerciseName] || 0) + 1 })
  const topExercises = Object.entries(exNameCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}(${v}次)`)
    .join('、') || '无训练记录'

  return {
    moodAvg,
    moodTrend,
    journalSnippets,
    expenseTotal,
    expenseBreakdown,
    workoutCount: exercises.length,
    topExercises,
    totalSets,
  }
}

function buildPrompt(type: string, periodStart: string, periodEnd: string, data: ReportData): string {
  const typeLabel = type === 'weekly' ? '周' : type === 'monthly' ? '月' : '年'
  const wordCount = type === 'weekly' ? 300 : type === 'monthly' ? 500 : 800

  const journalSummary = data.journalSnippets.length > 0
    ? data.journalSnippets.join('\n')
    : '无日记记录'

  return `你是一位温暖、积极的个人生活教练。请根据以下用户数据，生成一份${typeLabel}度生活报告。

要求：
- 以第二人称"你"称呼用户
- 语气温暖、鼓励、正能量
- 先总结整体状态，再分心情、生活、消费、健身几个方面
- 发现积极趋势和进步，给予肯定
- 如果有不足，用温和的方式给出1-2条合理建议
- 结尾送上一句和当前状况相关的鼓励或祝福
- 字数：${wordCount}字左右
- 用中文回复，保持简洁

=== 用户数据 ===
时间范围：${formatDateRange(periodStart, periodEnd)}
心情均值：${data.moodAvg}/5
心情分布：${data.moodTrend}
消费总计：¥${data.expenseTotal}
消费分类：${data.expenseBreakdown}
健身次数：${data.workoutCount}次
总训练组数：${data.totalSets}组
常练项目：${data.topExercises}
日记摘要：
${journalSummary}
=== 数据结束 ===`
}

function buildFallback(type: string, periodStart: string, periodEnd: string, data: ReportData): string {
  const typeLabel = type === 'weekly' ? '周' : type === 'monthly' ? '月' : '年'
  const range = formatDateRange(periodStart, periodEnd)
  return `📊 ${typeLabel}报 (${range})

心情均值：${data.moodAvg > 0 ? `${data.moodAvg}/5 (${MOOD_LABELS[Math.round(data.moodAvg)] || ''})` : '无数据'}
心情分布：${data.moodTrend || '无数据'}
消费总计：¥${data.expenseTotal}
消费分类：${data.expenseBreakdown}
健身次数：${data.workoutCount}次
训练组数：${data.totalSets}组
常练项目：${data.topExercises}

（AI 生成失败，以上为数据统计）`
}

export async function generateReport(
  type: 'weekly' | 'monthly' | 'yearly',
  periodStart: string,
  periodEnd: string,
): Promise<ReportResult> {
  const data = await gatherData(periodStart, periodEnd)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__DEEPSEEK_KEY__}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: buildPrompt(type, periodStart, periodEnd, data) }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const json = await response.json()
    const content = json.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('Empty response from API')
    }

    return {
      content: content.trim(),
      moodAvg: data.moodAvg,
      expenseTotal: data.expenseTotal,
    }
  } catch (err) {
    console.warn('LLM API failed, using fallback:', err)
    return {
      content: buildFallback(type, periodStart, periodEnd, data),
      moodAvg: data.moodAvg,
      expenseTotal: data.expenseTotal,
    }
  }
}

export function getReportRanges(): {
  weekly: { start: string; end: string }
  monthly: { start: string; end: string }
  yearly: { start: string; end: string }
} {
  return {
    weekly: getWeekRange(),
    monthly: getMonthRange(),
    yearly: getYearRange(),
  }
}

export function isReportDay(type: 'weekly' | 'monthly' | 'yearly'): boolean {
  const now = new Date()
  switch (type) {
    case 'weekly':
      return now.getDay() === 0 // Sunday
    case 'monthly': {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      return now.getDate() === lastDay
    }
    case 'yearly':
      return now.getMonth() === 11 && now.getDate() === 31
  }
}
