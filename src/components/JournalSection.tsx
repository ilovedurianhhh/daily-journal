import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { db, type JournalImage } from '../db'

const MAX_IMAGES = 6

interface Props {
  entryId: number
  initialText: string
}

export default function JournalSection({ entryId, initialText }: Props) {
  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(false)
  const [images, setImages] = useState<JournalImage[]>([])
  const [urls, setUrls] = useState<Map<number, string>>(new Map())
  const [viewingUrl, setViewingUrl] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(initialText)
  }, [entryId, initialText])

  // Load images
  useEffect(() => {
    db.images.where('entryId').equals(entryId).toArray().then(setImages)
  }, [entryId])

  useEffect(() => {
    const newUrls = new Map<number, string>()
    images.forEach(img => {
      if (img.id != null) newUrls.set(img.id, URL.createObjectURL(img.data))
    })
    setUrls(newUrls)
    return () => { newUrls.forEach(url => URL.revokeObjectURL(url)) }
  }, [images])

  const textRef = useRef(initialText)

  const flushSave = useCallback(async (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    await db.entries.update(entryId, { journal: value, updatedAt: new Date() })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [entryId])

  const onChange = (value: string) => {
    setText(value)
    textRef.current = value
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => flushSave(value), 800)
  }

  // Save on unmount (navigation away)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        if (textRef.current !== initialText) {
          // Synchronous save on unmount isn't possible with IndexedDB
          // but we can fire-and-forget
          db.entries.update(entryId, { journal: textRef.current, updatedAt: new Date() })
        }
      }
    }
  }, [entryId, initialText])

  // Save on page close / tab switch
  useEffect(() => {
    const onBeforeUnload = () => {
      if (textRef.current !== initialText) {
        // Use sendBeacon-like approach — IndexedDB writes are async but
        // the browser will wait for pending transactions on page hide
        db.entries.update(entryId, { journal: textRef.current, updatedAt: new Date() })
      }
    }
    const onVisibility = () => {
      if (document.hidden && textRef.current !== initialText) {
        if (timerRef.current) clearTimeout(timerRef.current)
        db.entries.update(entryId, { journal: textRef.current, updatedAt: new Date() })
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [entryId, initialText])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const resized = await resizeImage(file)
    await db.images.add({ entryId, data: resized, createdAt: new Date() })
    const imgs = await db.images.where('entryId').equals(entryId).toArray()
    setImages(imgs)
    if (fileRef.current) fileRef.current.value = ''
  }

  const deleteImage = async (id: number) => {
    const url = urls.get(id)
    if (url) URL.revokeObjectURL(url)
    await db.images.delete(id)
    setViewingUrl(null)
    const imgs = await db.images.where('entryId').equals(entryId).toArray()
    setImages(imgs)
  }

  return (
    <>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider">日记</h3>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-500">已保存 ✓</span>}
            {text.trim() && (
              <button
                onClick={() => {
                  setText('')
                  textRef.current = ''
                  if (timerRef.current) clearTimeout(timerRef.current)
                  db.entries.update(entryId, { journal: '', updatedAt: new Date() })
                }}
                className="text-xs text-[#d4cbc2] active:text-red-400 transition-colors"
              >
                清除
              </button>
            )}
          </div>
        </div>

        <textarea
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder="今天发生了什么？写点什么..."
          rows={5}
          className="w-full bg-transparent text-[15px] text-[#3d3535] placeholder-[#d4cbc2] outline-none resize-none font-serif leading-relaxed"
        />

        {/* Image grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#efe8e0]">
            {images.map(img => (
              <button
                key={img.id}
                onClick={() => img.id != null && urls.get(img.id) && setViewingUrl(urls.get(img.id)!)}
                className="aspect-square rounded-lg overflow-hidden bg-[#f5f0eb]"
              >
                {img.id != null && urls.get(img.id) && (
                  <img src={urls.get(img.id)!} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Add photo button */}
        {images.length < MAX_IMAGES && (
          <>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-1.5 text-xs text-[#b8a99a] hover:text-[#c97d6b] transition-colors ${images.length > 0 ? 'mt-3' : 'mt-4'}`}
            >
              <Plus size={14} strokeWidth={2} />
              添加照片
            </button>
          </>
        )}
      </div>

      {/* Fullscreen image viewer */}
      {viewingUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setViewingUrl(null)}>
          <button
            onClick={() => setViewingUrl(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
          >
            <X size={24} />
          </button>
          <button
            onClick={() => {
              const img = images.find(i => urls.get(i.id!) === viewingUrl)
              if (img?.id) deleteImage(img.id)
            }}
            className="absolute top-4 left-4 p-2 text-white/80 hover:text-red-400 z-10 text-sm"
          >
            删除
          </button>
          <img src={viewingUrl} alt="" className="max-w-full max-h-full object-contain p-4" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const maxDim = 1920
      let { width, height } = img
      if (width <= maxDim && height <= maxDim) { resolve(file); return }
      if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim }
      else { width = Math.round(width * (maxDim / height)); height = maxDim }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to resize'))
      }, file.type || 'image/jpeg', 0.85)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}
