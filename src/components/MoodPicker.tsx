const moods = [
  { value: 5, emoji: '😄', label: '很好', desc: '开心充实' },
  { value: 4, emoji: '🙂', label: '不错', desc: '平静愉快' },
  { value: 3, emoji: '😐', label: '一般', desc: '平平淡淡' },
  { value: 2, emoji: '😔', label: '不太好', desc: '有点低落' },
  { value: 1, emoji: '😢', label: '很差', desc: '很难过' },
]

interface Props {
  value: number
  onChange: (mood: number) => void
}

export default function MoodPicker({ value, onChange }: Props) {
  const currentMood = moods.find(m => m.value === value)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[#b8a99a] dark:text-slate-400 uppercase tracking-wider">今日心情</h3>
        {currentMood && (
          <span className="text-xs text-[#c97d6b] dark:text-rose-400 bg-[#f8ede8] dark:bg-rose-950 px-2 py-0.5 rounded-full">
            {currentMood.emoji} {currentMood.label}
          </span>
        )}
      </div>
      <div className="flex justify-between">
        {moods.map(({ value: v, emoji, label, desc }) => {
          const selected = value === v
          return (
            <button
              key={v}
              onClick={() => onChange(selected ? 0 : v)}
              className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-2xl transition-all min-w-0 flex-1 ${
                selected
                  ? 'bg-[#f8ede8] dark:bg-rose-950 scale-110'
                  : 'hover:bg-[#f5f0eb] dark:hover:bg-slate-800'
              }`}
            >
              <span className={`transition-all ${selected ? 'text-3xl' : 'text-2xl grayscale-[30%]'}`}>
                {emoji}
              </span>
              <span className={`text-xs font-medium ${selected ? 'text-[#c97d6b] dark:text-rose-400' : 'text-[#b8a99a] dark:text-slate-400'}`}>
                {label}
              </span>
              {selected && (
                <span className="text-[10px] text-[#c97d6b] dark:text-rose-400/70 -mt-0.5">{desc}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
