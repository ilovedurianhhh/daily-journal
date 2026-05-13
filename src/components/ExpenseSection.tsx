import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { db, type Expense } from '../db'

const categories: Record<string, { emoji: string; label: string }> = {
  food: { emoji: '🍜', label: '餐饮' },
  transport: { emoji: '🚗', label: '交通' },
  shopping: { emoji: '🛒', label: '购物' },
  entertainment: { emoji: '🎬', label: '娱乐' },
  home: { emoji: '🏠', label: '居家' },
  other: { emoji: '📌', label: '其他' },
}

interface Props {
  date: string
}

export default function ExpenseSection({ date }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('food')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    db.expenses.where('date').equals(date).toArray().then(setExpenses)
  }, [date])

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  const addExpense = async () => {
    if (!amount || Number(amount) <= 0) return
    await db.expenses.add({
      date,
      category: category as Expense['category'],
      amount: Number(amount),
      note: note.trim(),
      createdAt: new Date(),
    })
    setAmount(''); setNote('')
    setShowForm(false)
    const list = await db.expenses.where('date').equals(date).toArray()
    setExpenses(list)
  }

  const deleteExpense = async (id: number) => {
    await db.expenses.delete(id)
    setExpenses(expenses.filter(e => e.id !== id))
  }

  const entries = Object.entries(categories)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider">今日消费</h3>
          {total > 0 && (
            <span className="text-sm font-bold text-[#c97d6b] font-serif">¥{total}</span>
          )}
        </div>
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
            {entries.map(([key, { emoji, label }]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  category === key
                    ? 'bg-white text-[#c97d6b] shadow-sm border border-[#efe8e0]'
                    : 'text-[#8b7e74] hover:bg-white/60'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#b8a99a]">¥</span>
              <input
                type="number"
                placeholder="金额"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-white rounded-lg pl-7 pr-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors"
              />
            </div>
            <button
              onClick={addExpense}
              disabled={!amount || Number(amount) <= 0}
              className="px-4 py-2.5 bg-[#c97d6b] text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              添加
            </button>
          </div>
          <input
            type="text"
            placeholder="备注（可选）"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full bg-white rounded-lg px-3 py-2.5 text-sm text-[#3d3535] placeholder-[#d4cbc2] outline-none border border-[#efe8e0] focus:border-[#c97d6b]/30 transition-colors"
          />
        </div>
      )}

      {expenses.length === 0 && !showForm && (
        <p className="text-sm text-[#d4cbc2] py-2 text-center font-serif italic">记录今天的开销</p>
      )}

      <div className="space-y-1">
        {expenses.map(e => {
          const cat = categories[e.category]
          return (
            <div key={e.id} className="flex items-center gap-3 py-1.5 group">
              <span className="text-base">{cat.emoji}</span>
              <span className="flex-1 text-sm text-[#3d3535]">
                {e.note || cat.label}
              </span>
              <span className="text-sm font-medium text-[#c97d6b] font-serif">¥{e.amount}</span>
              <button
                onClick={() => deleteExpense(e.id!)}
                className="opacity-0 group-hover:opacity-100 text-[#d4cbc2] hover:text-[#c97d6b] transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
