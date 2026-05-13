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

function buildWeeklyPrompt(periodStart: string, periodEnd: string, data: ReportData): string {
  const journalSummary = data.journalSnippets.length > 0
    ? data.journalSnippets.join('\n')
    : '无日记记录'

  return `你是一位温暖、贴心的生活伙伴。请根据以下用户数据，生成一份本周简报。

要求：
- 用"你"称呼用户，像朋友聊天一样亲切自然
- 简要概括这周的整体状态（2-3句话）
- 挑出本周最值得注意的1-2件事（从日记中挖掘亮点或有趣的事）
- 说说心情变化和消费是否合理（一句话带过即可）
- 如果这周有健身，夸一下；没有就温和鼓励一下
- 不要罗列数据，不要写"心情均值"、"消费总计"这些词
- 最后给一句轻松的周末祝福
- 控制在200字左右
- 用中文

=== 用户数据 ===
时间：${formatDateRange(periodStart, periodEnd)}
心情：${data.moodAvg}/5（${data.moodTrend}）
消费：共¥${data.expenseTotal}（${data.expenseBreakdown}）
健身：${data.workoutCount}次训练，${data.totalSets}组（${data.topExercises}）
日记：
${journalSummary}
=== 结束 ===`
}

function buildMonthlyPrompt(periodStart: string, periodEnd: string, data: ReportData): string {
  const journalSummary = data.journalSnippets.length > 0
    ? data.journalSnippets.join('\n')
    : '无日记记录'

  return `你是一位专业的个人成长教练。请根据以下用户数据，生成一份月度生活报告。

要求：
- 用"你"称呼用户，语气温暖而专业
- 开头用2-3句话总结这个月的整体状态
- 分三个段落：
  1. 🧠 心情与生活：分析情绪变化趋势，指出哪些日子/事件影响了心情，肯定用户面对困难时的韧性
  2. 💰 消费回顾：分析消费结构是否健康，给出1条实用的省钱或理财小建议
  3. 💪 健身复盘：评价训练频率和强度，肯定进步，给出下个月的训练方向
- 从日记中提取1-2个值得记住的瞬间
- 结尾给出下个月的1个小目标或期许
- 控制在400字左右
- 用中文，段落之间空一行

=== 用户数据 ===
时间：${formatDateRange(periodStart, periodEnd)}
心情均值：${data.moodAvg}/5
心情分布：${data.moodTrend}
消费总计：¥${data.expenseTotal}
消费分类：${data.expenseBreakdown}
健身次数：${data.workoutCount}次
训练组数：${data.totalSets}组
常练项目：${data.topExercises}
日记摘要：
${journalSummary}
=== 结束 ===`
}

function buildYearlyPrompt(periodStart: string, periodEnd: string, data: ReportData): string {
  const journalSummary = data.journalSnippets.length > 0
    ? data.journalSnippets.join('\n')
    : '无日记记录'

  return `你是一位温厚而有智慧的人生导师。请根据以下用户数据，生成一份年度回顾信。

要求：
- 用"亲爱的你"开头，以书信体写这封信
- 整体主题：这一年你做得很好，你比自己想象的更强大
- 结构：
  1. 开篇：回顾这一年，肯定用户坚持记录的毅力
  2. 心情之路：描述这一年的情绪曲线，强调你已经走过了那些低潮，迎来了那些光亮
  3. 生活的痕迹：从日记中提炼这一年的重要片段——可能是某个决定、某次旅行、某段关系的变化
  4. 财务与身体：简评消费习惯的变化和健身的坚持，肯定自律
  5. 致新一年：写下对新一年的期许和祝福，引用一句和当下心境契合的名言
- 语气深情但不煽情，真诚温暖
- 600-700字
- 用中文

=== 用户数据 ===
时间：${formatDateRange(periodStart, periodEnd)}
心情均值：${data.moodAvg}/5
心情分布：${data.moodTrend}
消费总计：¥${data.expenseTotal}
消费分类：${data.expenseBreakdown}
健身次数：${data.workoutCount}次
训练组数：${data.totalSets}组
常练项目：${data.topExercises}
日记摘要：
${journalSummary}
=== 结束 ===`
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
        messages: [{ role: 'user', content: type === 'weekly'
          ? buildWeeklyPrompt(periodStart, periodEnd, data)
          : type === 'monthly'
            ? buildMonthlyPrompt(periodStart, periodEnd, data)
            : buildYearlyPrompt(periodStart, periodEnd, data)
        }],
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
