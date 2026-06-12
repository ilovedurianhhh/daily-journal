import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { db, type Summary } from '../db'
import { generateReport, getReportRanges, isReportDay } from '../services/llm'

type ReportType = 'weekly' | 'monthly' | 'yearly'

const TYPE_LABELS: Record<ReportType, string> = {
  weekly: '周报',
  monthly: '月报',
  yearly: '年报',
}

export default function ReportCard() {
  const [activeTab, setActiveTab] = useState<ReportType>('weekly')
  const [summaries, setSummaries] = useState<Record<ReportType, Summary | null>>({
    weekly: null, monthly: null, yearly: null,
  })
  const [loading, setLoading] = useState(false)

  const ranges = useMemo(() => getReportRanges(), [])

  const loadSummaries = useCallback(async () => {
    const all = await db.summaries.toArray()
    const map: Record<ReportType, Summary | null> = { weekly: null, monthly: null, yearly: null }
    for (const s of all) {
      const { start, end } = ranges[s.type as ReportType]
      if (s.periodStart === start && s.periodEnd === end) {
        map[s.type as ReportType] = s
      }
    }
    setSummaries(map)
  }, [ranges])

  useEffect(() => {
    loadSummaries()
  }, [loadSummaries])

  // Auto-generate on report day
  useEffect(() => {
    const types: ReportType[] = ['weekly', 'monthly', 'yearly']
    types.forEach(async type => {
      if (isReportDay(type)) {
        const existing = await db.summaries
          .where({ type, periodStart: ranges[type].start, periodEnd: ranges[type].end })
          .first()
        if (!existing) {
          setLoading(true)
          try {
            const result = await generateReport(type, ranges[type].start, ranges[type].end)
            await db.summaries.add({
              type,
              periodStart: ranges[type].start,
              periodEnd: ranges[type].end,
              content: result.content,
              moodAvg: result.moodAvg,
              expenseTotal: result.expenseTotal,
              createdAt: new Date(),
            })
          } catch (e) {
            console.warn('Auto-generate failed:', e)
          }
          setLoading(false)
          await loadSummaries()
        }
      }
    })
  }, [ranges])

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // Delete existing summary for this period if any
      const existing = summaries[activeTab]
      if (existing?.id) await db.summaries.delete(existing.id)

      const result = await generateReport(activeTab, ranges[activeTab].start, ranges[activeTab].end)
      await db.summaries.add({
        type: activeTab,
        periodStart: ranges[activeTab].start,
        periodEnd: ranges[activeTab].end,
        content: result.content,
        moodAvg: result.moodAvg,
        expenseTotal: result.expenseTotal,
        createdAt: new Date(),
      })
      await loadSummaries()
    } catch (e) {
      console.error('Generate failed:', e)
    }
    setLoading(false)
  }

  const current = summaries[activeTab]
  const range = ranges[activeTab]

  const formatRange = (s: string, e: string) => {
    const start = new Date(s + 'T00:00:00')
    const end = new Date(e + 'T00:00:00')
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-[#c97d6b] dark:text-rose-400" />
        <h3 className="text-xs font-medium text-[#b8a99a] dark:text-slate-400 uppercase tracking-wider">AI 智能报告</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#faf8f5] dark:bg-slate-800 rounded-lg p-1">
        {(Object.keys(TYPE_LABELS) as ReportType[]).map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === type
                ? 'bg-white text-[#c97d6b] dark:text-rose-400 shadow-sm'
                : 'text-[#b8a99a] dark:text-slate-400 hover:text-[#8b7e74]'
            }`}
          >
            {TYPE_LABELS[type]}
            {summaries[type] ? ' ✓' : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      {current ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#b8a99a] dark:text-slate-400">
              📅 {formatRange(range.start, range.end)}
            </span>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-[#b8a99a] dark:text-slate-400 hover:text-[#c97d6b] dark:text-rose-400 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              重新生成
            </button>
          </div>

          {current.moodAvg > 0 && (
            <div className="flex gap-4 mb-3 text-xs text-[#b8a99a] dark:text-slate-400">
              <span>心情均值 ⭐{current.moodAvg}</span>
              <span>消费 💰¥{current.expenseTotal}</span>
            </div>
          )}

          <div className="bg-[#faf8f5] dark:bg-slate-800 rounded-xl p-4">
            <div className="text-sm text-[#3d3535] dark:text-slate-100 leading-relaxed font-serif whitespace-pre-wrap">
              {current.content}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-[#d4cbc2] mb-4 font-serif italic">
            暂无{TYPE_LABELS[activeTab]}
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#c97d6b] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                生成{TYPE_LABELS[activeTab]}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
