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
      openExternal(src)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
      style={{
        paddingTop:    'max(env(safe-area-inset-top), 5rem)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom), 0px) + 6rem)',
        paddingLeft:   '1rem',
        paddingRight:  '1rem',
      }}
    >
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-lg"
      />

      {/* Bottom action bar — clear of all Telegram chrome */}
      <div
        className="fixed left-0 right-0 flex items-center justify-center gap-3 px-4"
        style={{ bottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={download}
          className="flex items-center gap-2 bg-white text-[#1B2D1F] font-semibold px-5 py-3 rounded-full shadow-2xl active:scale-95 transition-transform"
        >
          <Download size={18} /> Yuklab olish
        </button>
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}
