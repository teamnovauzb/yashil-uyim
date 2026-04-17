import { useEffect } from 'react'
import { X, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { openExternal } from '../lib/telegram'

export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const download = async () => {
    try {
      const res = await fetch(src)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (alt || 'image').replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.jpg'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Yuklab olindi')
    } catch {
      // Inside Telegram or restricted contexts: open in external browser
      openExternal(src)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute right-3 flex gap-2" style={{ top: 'max(env(safe-area-inset-top), 1rem)' }}>
        <button
          onClick={(e) => { e.stopPropagation(); download() }}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center"
          aria-label="Download"
        >
          <Download size={18} />
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain px-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 4rem)', paddingBottom: '2rem' }}
      />
    </div>
  )
}
