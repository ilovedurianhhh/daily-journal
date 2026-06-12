import { useState, useEffect, useRef } from 'react'
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
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  // Refs that always point to current values — avoids stale closure bugs
  const entryIdRef = useRef(entryId)
  const textRef = useRef(initialText)
  const initialTextRef = useRef(initialText)

  // Keep refs in sync with props
  entryIdRef.current = entryId
  useEffect(() => { initialTextRef.current = initialText }, [initialText])
  // textRef is updated in onChange

  // When entry changes, immediately flush pending save to OLD entry, then load new
  useEffect(() => {
    // Flush any pending text to the PREVIOUS entryId before switching
    if (textRef.current !== initialTextRef.current) {
      db.entries.update(entryIdRef.current, { journal: textRef.current, updatedAt: new Date() })
    }
    // Clear timer from previous entry
    if (timerRef.current) clearTimeout(timerRef.current)
    // Reset to new entry's text
    setText(initialText)
    textRef.current = initialText
    setLoading(false)
  }, [entryId, initialText])

  // Load images
  useEffect(() => {
    db.images.where('entryId').equals(entryId).toArray().then(setImages).catch(() => {})
  }, [entryId])

  // Create/revoke object URLs
  useEffect(() => {
    const newUrls = new Map<number, string>()
    images.forEach(img => {
      if (img.id != null) newUrls.set(img.id, URL.createObjectURL(img.data))
    })
    setUrls(newUrls)
    return () => { newUrls.forEach(url => URL.revokeObjectURL(url)) }
  }, [images])

  const doSave = async (value: string, targetEntryId: number) => {
    try {
      await db.entries.update(targetEntryId, { journal: value, updatedAt: new Date() })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  const onChange = (value: string) => {
    setText(value)
    textRef.current = value
    if (timerRef.current) clearTimeout(timerRef.current)
    // Capture entryId at time of typing — ensures save targets the correct entry
    const targetId = entryIdRef.current
    timerRef.current = setTimeout(() => doSave(value, targetId), 800)
  }

  // Save on unmount / page hide — use refs to avoid stale closure
  useEffect(() => {
    const flushNow = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (textRef.current !== initialTextRef.current) {
        db.entries.update(entryIdRef.current, { journal: textRef.current, updatedAt: new Date() })
      }
    }
    const onVisibility = () => {
      if (document.hidden) flushNow()
    }
    window.addEventListener('beforeunload', flushNow)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      flushNow() // also flush on cleanup (entry switch)
      window.removeEventListener('beforeunload', flushNow)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [entryId]) // re-attach when entryId changes so flushNow captures correct entryIdRef

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const resized = await resizeImage(file)
      await db.images.add({ entryId, data: resized, createdAt: new Date() })
      const imgs = await db.images.where('entryId').equals(entryId).toArray()
      setImages(imgs)
    } catch (err) { console.error('Image upload failed:', err) }
    if (fileRef.current) fileRef.current.value = ''
  }

  const deleteImage = async (id: number) => {
    const url = urls.get(id)
    if (url) URL.revokeObjectURL(url)
    try {
      await db.images.delete(id)
    } catch (err) { console.error('Delete failed:', err) }
    setViewingUrl(null)
    const imgs = await db.images.where('entryId').equals(entryId).toArray()
    setImages(imgs)
  }

  return (
    <>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-[#b8a99a] dark:text-slate-400 uppercase tracking-wider">日记</h3>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-500">已保存 ✓</span>}
            {text.trim() && (
              <button
                onClick={() => {
                  setText('')
                  textRef.current = ''
                  if (timerRef.current) clearTimeout(timerRef.current)
                  doSave('', entryId)
                }}
                className="text-xs text-[#d4cbc2] dark:text-slate-500 active:text-red-400 transition-colors"
              >
                清除
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[#b8a99a] dark:text-slate-400 font-serif italic">加载中...</div>
        ) : (
          <textarea
            value={text}
            onChange={e => onChange(e.target.value)}
            placeholder="今天发生了什么？写点什么..."
            rows={5}
            className="w-full bg-transparent text-[15px] text-[#3d3535] dark:text-slate-100 placeholder-[#d4cbc2] dark:placeholder-slate-600 outline-none resize-none font-serif leading-relaxed"
          />
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#efe8e0] dark:border-slate-700">
            {images.map(img => (
              <button
                key={img.id}
                onClick={() => img.id != null && urls.get(img.id) && setViewingUrl(urls.get(img.id)!)}
                className="aspect-square rounded-lg overflow-hidden bg-[#f5f0eb] dark:bg-slate-700"
              >
                {img.id != null && urls.get(img.id) && (
                  <img src={urls.get(img.id)!} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </button>
            ))}
          </div>
        )}

        {images.length < MAX_IMAGES && (
          <>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-1.5 text-xs text-[#b8a99a] dark:text-slate-400 hover:text-[#c97d6b] dark:hover:text-rose-400 transition-colors ${images.length > 0 ? 'mt-3' : 'mt-4'}`}
            >
              <Plus size={14} strokeWidth={2} />
              添加照片
            </button>
          </>
        )}
      </div>

      {viewingUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setViewingUrl(null)}>
          <button onClick={() => setViewingUrl(null)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10">
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
