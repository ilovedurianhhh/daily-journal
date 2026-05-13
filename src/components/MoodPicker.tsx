const moods = [
  { value: 5, emoji: '😄', label: '很好' },
  { value: 4, emoji: '🙂', label: '不错' },
  { value: 3, emoji: '😐', label: '一般' },
  { value: 2, emoji: '😔', label: '不太好' },
  { value: 1, emoji: '😢', label: '很差' },
]

interface Props {
  value: number
  onChange: (mood: number) => void
}

export default function MoodPicker({ value, onChange }: Props) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">今日心情</h2>
      <div className="flex justify-between gap-1">
        {moods.map(({ value: v, emoji, label }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-xl transition-colors ${
              value === v
                ? 'bg-indigo-500/20 ring-1 ring-indigo-400'
                : 'bg-slate-800 hover:bg-slate-800/70'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className={`text-xs ${value === v ? 'text-indigo-300' : 'text-slate-500'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
