import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import { db, type JournalImage } from '../db'

const MAX_IMAGES = 9

interface Props {
  entryId: number
}

export default function ImageGallery({ entryId }: Props) {
  const [images, setImages] = useState<JournalImage[]>([])
  const [urls, setUrls] = useState<Map<number, string>>(new Map())
  const [viewing, setViewing] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadImages = useCallback(async () => {
    const imgs = await db.images.where('entryId').equals(entryId).toArray()
    setImages(imgs)
  }, [entryId])

  useEffect(() => {
    loadImages()
  }, [loadImages])

  // Create object URLs for display
  useEffect(() => {
    const newUrls = new Map<number, string>()
    images.forEach(img => {
      if (img.id != null) {
        newUrls.set(img.id, URL.createObjectURL(img.data))
      }
    })
    setUrls(newUrls)
    return () => {
      newUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [images])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Resize large images to ~1920px max dimension
    const resized = await resizeImage(file)
    await db.images.add({
      entryId,
      data: resized,
      createdAt: new Date(),
    })
    await loadImages()
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  const deleteImage = async (id: number) => {
    const url = urls.get(id)
    if (url) URL.revokeObjectURL(url)
    await db.images.delete(id)
    setViewing(null)
    await loadImages()
  }

  const viewingImage = viewing != null ? images.find(i => i.id === viewing) : null
  const viewingUrl = viewing != null ? urls.get(viewing) : null

  return (
    <>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-[#b8a99a] uppercase tracking-wider">图片</h3>
          <span className="text-xs text-[#b8a99a]">{images.length}/{MAX_IMAGES}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {images.map(img => (
            <button
              key={img.id}
              onClick={() => setViewing(img.id!)}
              className="aspect-square rounded-lg overflow-hidden bg-[#f5f0eb] relative group"
            >
              {urls.get(img.id!) && (
                <img
                  src={urls.get(img.id!)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </button>
          ))}

          {images.length < MAX_IMAGES && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-[#e0d8ce] flex flex-col items-center justify-center gap-1 text-[#b8a99a] hover:border-[#c97d6b] hover:text-[#c97d6b] transition-colors"
              >
                <Plus size={22} strokeWidth={1.5} />
                <span className="text-[10px]">添加</span>
              </button>
            </>
          )}
        </div>

        {images.length === 0 && (
          <p className="text-sm text-[#d4cbc2] py-2 text-center font-serif italic">
            添加今天的照片
          </p>
        )}
      </div>

      {/* Fullscreen viewer */}
      {viewingImage && viewingUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setViewing(null)}
        >
          <button
            onClick={() => setViewing(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
          >
            <X size={24} />
          </button>
          <button
            onClick={() => deleteImage(viewingImage.id!)}
            className="absolute top-4 left-4 p-2 text-white/80 hover:text-red-400 z-10"
          >
            <Trash2 size={20} />
          </button>
          <img
            src={viewingUrl}
            alt=""
            className="max-w-full max-h-full object-contain p-4"
            onClick={e => e.stopPropagation()}
          />
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
      if (width <= maxDim && height <= maxDim) {
        resolve(file)
        return
      }
      if (width > height) {
        height = Math.round(height * (maxDim / width))
        width = maxDim
      } else {
        width = Math.round(width * (maxDim / height))
        height = maxDim
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to resize'))
      }, file.type || 'image/jpeg', 0.85)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}
