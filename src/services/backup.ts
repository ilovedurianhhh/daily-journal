import { db } from '../db'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export async function exportAll(): Promise<string> {
  const entries = await db.entries.toArray()
  const expenses = await db.expenses.toArray()
  const exercises = await db.exercises.toArray()
  const summaries = await db.summaries.toArray()

  const images = await db.images.toArray()
  const imageData = await Promise.all(images.map(async img => ({
    id: img.id,
    entryId: img.entryId,
    data: await blobToBase64(img.data),
    createdAt: img.createdAt,
  })))

  const exImages = await db.exerciseImages.toArray()
  const exImageData = await Promise.all(exImages.map(async img => ({
    id: img.id,
    exerciseId: img.exerciseId,
    data: await blobToBase64(img.data),
    createdAt: img.createdAt,
  })))

  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    entries, expenses, exercises, summaries,
    images: imageData,
    exerciseImages: exImageData,
  }, null, 2)
}

export async function importAll(jsonStr: string) {
  let data: any
  try { data = JSON.parse(jsonStr) }
  catch { throw new Error('无效的备份文件：JSON 解析失败') }
  if (!data.version || !data.entries) throw new Error('无效的备份文件：缺少必要字段')

  // Validate all data before clearing anything
  const entriesToImport = data.entries as any[]
  if (!Array.isArray(entriesToImport) || entriesToImport.length === 0) throw new Error('备份文件中没有数据')

  // Process images first — if blobs are invalid, fail before clearing
  const imageEntries: { entryId: number; data: Blob; createdAt: Date }[] = []
  if (data.images) {
    for (const img of data.images) {
      imageEntries.push({ entryId: img.entryId, data: base64ToBlob(img.data), createdAt: img.createdAt })
    }
  }
  const exImageEntries: { exerciseId: number; data: Blob; createdAt: Date }[] = []
  if (data.exerciseImages) {
    for (const img of data.exerciseImages) {
      exImageEntries.push({ exerciseId: img.exerciseId, data: base64ToBlob(img.data), createdAt: img.createdAt })
    }
  }

  // Now clear and import
  await db.entries.clear()
  await db.expenses.clear()
  await db.exercises.clear()
  await db.summaries.clear()
  await db.images.clear()
  await db.exerciseImages.clear()

  await db.entries.bulkAdd(entriesToImport)
  if (data.expenses) await db.expenses.bulkAdd(data.expenses)
  if (data.exercises) await db.exercises.bulkAdd(data.exercises)
  if (data.summaries) await db.summaries.bulkAdd(data.summaries)
  for (const img of imageEntries) await db.images.add(img)
  for (const img of exImageEntries) await db.exerciseImages.add(img)
}

export function downloadFile(content: string, filename: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportMarkdown(): Promise<string> {
  const entries = await db.entries.orderBy('date').toArray()
  const expenses = await db.expenses.orderBy('date').toArray()
  const exercises = await db.exercises.orderBy('date').toArray()

  const expenseMap = new Map<string, typeof expenses>()
  expenses.forEach(e => {
    const arr = expenseMap.get(e.date) || []
    arr.push(e)
    expenseMap.set(e.date, arr)
  })

  const exMap = new Map<string, typeof exercises>()
  exercises.forEach(e => {
    const arr = exMap.get(e.date) || []
    arr.push(e)
    exMap.set(e.date, arr)
  })

  const MOODS: Record<number, string> = { 5: '😄 很好', 4: '🙂 不错', 3: '😐 一般', 2: '😔 不太好', 1: '😢 很差' }

  const lines: string[] = ['# 我的生活记录\n']

  entries.forEach(e => {
    const d = new Date(e.date + 'T00:00:00')
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    lines.push(`## ${e.date} (周${weekdays[d.getDay()]})`)
    lines.push('')
    if (e.mood > 0) lines.push(`**心情：** ${MOODS[e.mood] || ''}`)
    if (e.journal.trim()) {
      lines.push('')
      lines.push(e.journal.trim())
    }
    const dayExps = expenseMap.get(e.date)
    if (dayExps && dayExps.length > 0) {
      lines.push('')
      lines.push('**消费：**')
      const total = dayExps.reduce((s, x) => s + x.amount, 0)
      dayExps.forEach(x => lines.push(`- ${x.category} ¥${x.amount} ${x.note || ''}`.trim()))
      lines.push(`  合计：¥${total}`)
    }
    const dayExs = exMap.get(e.date)
    if (dayExs && dayExs.length > 0) {
      lines.push('')
      lines.push('**健身：**')
      dayExs.forEach(x => {
        const typeLabel = x.type === 'strength' ? '🏋️ 力量' : '🏃 有氧'
        lines.push(`- ${typeLabel} ${x.exerciseName}`)
        if (x.type === 'strength') {
          x.sets.forEach((s, i) => lines.push(`  组${i + 1}: ${s.weightKg || '-'}kg × ${s.reps || '-'}次`))
        } else {
          const s = x.sets[0]
          if (s?.durationMinutes) lines.push(`  ${s.durationMinutes}分钟`)
          if (s?.distanceKm) lines.push(`  ${s.distanceKm}km`)
        }
        if (x.notes) lines.push(`  备注：${x.notes}`)
      })
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  })

  return lines.join('\n')
}
