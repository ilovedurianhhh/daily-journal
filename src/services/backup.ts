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
  const data = JSON.parse(jsonStr)
  if (!data.version || !data.entries) throw new Error('无效的备份文件')

  // Clear all existing data
  await db.entries.clear()
  await db.expenses.clear()
  await db.exercises.clear()
  await db.summaries.clear()
  await db.images.clear()
  await db.exerciseImages.clear()

  await db.entries.bulkAdd(data.entries)
  if (data.expenses) await db.expenses.bulkAdd(data.expenses)
  if (data.exercises) await db.exercises.bulkAdd(data.exercises)
  if (data.summaries) await db.summaries.bulkAdd(data.summaries)

  if (data.images) {
    for (const img of data.images) {
      const blob = base64ToBlob(img.data)
      await db.images.add({ entryId: img.entryId, data: blob, createdAt: img.createdAt })
    }
  }

  if (data.exerciseImages) {
    for (const img of data.exerciseImages) {
      const blob = base64ToBlob(img.data)
      await db.exerciseImages.add({ exerciseId: img.exerciseId, data: blob, createdAt: img.createdAt })
    }
  }
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
