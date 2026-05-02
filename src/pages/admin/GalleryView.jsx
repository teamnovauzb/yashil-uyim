import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, Save, Upload, Images, PlayCircle } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../../lib/supabase'
import { uploadFile, pathFromMediaUrl } from '../../lib/upload'
import { EditDrawer, Labeled } from './NewsView'

const MAX_VIDEO_BYTES = 15 * 1024 * 1024 // 15 MB

const empty = {
  id: null,
  media_type: 'image',
  media_url: '',
  thumbnail_url: '',
  caption: '',
  sort_order: 0,
}

const COMPRESSION_OPTS = {
  maxSizeMB:         0.5,
  maxWidthOrHeight:  1280,
  useWebWorker:      true,
  initialQuality:    0.8,
  fileType:          'image/jpeg',
}

// Capture a JPEG thumbnail blob from the first frame of a video file.
async function videoToThumbnail(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    video.src = URL.createObjectURL(file)

    const cleanup = () => URL.revokeObjectURL(video.src)

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2)
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width  = video.videoWidth  || 1280
        canvas.height = video.videoHeight || 720
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          cleanup()
          if (!blob) return reject(new Error('Thumbnail capture failed'))
          const f = new File([blob], 'poster.jpg', { type: 'image/jpeg' })
          resolve(f)
        }, 'image/jpeg', 0.8)
      } catch (err) {
        cleanup()
        reject(err)
      }
    }
    video.onerror = () => { cleanup(); reject(new Error('Video load failed')) }
  })
}

export default function GalleryView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('sort_order', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isImage && !isVideo) {
      toast.error('Faqat rasm yoki video fayllar qabul qilinadi')
      return
    }

    setUploading(true)
    try {
      if (isImage) {
        toast.loading('Rasm siqilmoqda...', { id: 'gallery-upload' })
        const compressed = await imageCompression(file, COMPRESSION_OPTS)
        toast.loading('Yuklanmoqda...', { id: 'gallery-upload' })
        const url = await uploadFile(compressed, 'gallery')
        toast.success(
          `Rasm yuklandi (${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024).toFixed(0)}KB)`,
          { id: 'gallery-upload' }
        )
        setEditing((prev) => ({ ...prev, media_type: 'image', media_url: url, thumbnail_url: '' }))
      } else {
        if (file.size > MAX_VIDEO_BYTES) {
          toast.error(
            `Video juda katta (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 15MB. Iltimos, 720p / 30s ga siqib qayta yuklang.`,
            { id: 'gallery-upload', duration: 6000 }
          )
          return
        }
        toast.loading('Video tahlil qilinmoqda...', { id: 'gallery-upload' })
        let thumbUrl = ''
        try {
          const rawThumb = await videoToThumbnail(file)
          const compressedThumb = await imageCompression(rawThumb, COMPRESSION_OPTS)
          thumbUrl = await uploadFile(compressedThumb, 'gallery')
        } catch (e) {
          console.warn('thumbnail extraction failed:', e)
        }
        toast.loading('Video yuklanmoqda...', { id: 'gallery-upload' })
        const url = await uploadFile(file, 'gallery')
        toast.success(`Video yuklandi (${(file.size / 1024 / 1024).toFixed(1)}MB)`, { id: 'gallery-upload' })
        setEditing((prev) => ({ ...prev, media_type: 'video', media_url: url, thumbnail_url: thumbUrl }))
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Yuklashda xato', { id: 'gallery-upload' })
    }
    setUploading(false)
  }

  const onSave = async (e) => {
    e.preventDefault()
    if (!editing.media_url) return toast.error('Avval rasm yoki video yuklang')

    const payload = {
      media_type:    editing.media_type,
      media_url:     editing.media_url,
      thumbnail_url: editing.thumbnail_url || null,
      caption:       editing.caption?.trim() || null,
      sort_order:    Number(editing.sort_order) || 0,
    }

    const action = editing.id
      ? supabase.from('gallery').update(payload).eq('id', editing.id)
      : supabase.from('gallery').insert(payload)
    const { error } = await action
    if (error) return toast.error(error.message)
    toast.success('Saqlandi')
    setEditing(null)
    load()
  }

  const onDelete = async (item) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    // Remove storage files first (best-effort) then the row.
    const paths = [pathFromMediaUrl(item.media_url), pathFromMediaUrl(item.thumbnail_url)]
      .filter(Boolean)
    if (paths.length) {
      await supabase.storage.from('media').remove(paths).catch(() => {})
    }
    const { error } = await supabase.from('gallery').delete().eq('id', item.id)
    if (error) return toast.error(error.message)
    toast.success("O'chirildi")
    load()
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold">Galereya ({items.length})</h2>
        <button
          onClick={() => setEditing({ ...empty })}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-semibold"
        >
          <Plus size={14} /> Yangi
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-12 text-sm">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-600 py-12 text-sm">Galereya bo'sh</div>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((it) => {
            const thumb = it.thumbnail_url || (it.media_type === 'image' ? it.media_url : null)
            return (
              <li key={it.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 border border-gray-800 group">
                {thumb ? (
                  <img src={thumb} alt={it.caption || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Images size={24} />
                  </div>
                )}
                {it.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <PlayCircle size={32} className="text-white drop-shadow-lg" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing({ ...it })}
                    className="w-7 h-7 rounded-lg bg-gray-900/90 hover:bg-gray-800 text-white flex items-center justify-center"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => onDelete(it)}
                    className="w-7 h-7 rounded-lg bg-gray-900/90 hover:bg-rose-500/90 text-white flex items-center justify-center"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {it.caption && (
                  <p className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] text-white bg-gradient-to-t from-black/80 to-transparent truncate">
                    {it.caption}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <EditDrawer
          title={editing.id ? 'Tahrirlash' : 'Yangi media'}
          onClose={() => setEditing(null)}
          onSave={onSave}
        >
          <Labeled label="Fayl (rasm yoki video)">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              onChange={onPickFile}
              className="hidden"
            />
            {editing.media_url ? (
              <div className="relative">
                {editing.media_type === 'video' ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-black">
                    {editing.thumbnail_url ? (
                      <img src={editing.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={editing.media_url} className="w-full h-full object-cover" muted playsInline />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <PlayCircle size={40} className="text-white drop-shadow-lg" />
                    </div>
                  </div>
                ) : (
                  <img src={editing.media_url} alt="" className="w-full h-36 object-cover rounded-xl" />
                )}
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, media_url: '', thumbnail_url: '' })}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-28 rounded-xl border-2 border-dashed border-gray-700 hover:border-green-500 hover:bg-gray-800/50 flex flex-col items-center justify-center gap-1.5 text-gray-500 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <span className="text-xs">Tayyorlanmoqda...</span>
                ) : (
                  <>
                    <Upload size={18} />
                    <span className="text-xs">Fayl tanlang (max 15MB video)</span>
                  </>
                )}
              </button>
            )}
            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
              Rasmlar avtomatik 1280px / JPEG ga siqiladi. Videolar 720p, ~30 soniya tavsiya qilinadi.
            </p>
          </Labeled>

          <Labeled label="Izoh (ixtiyoriy)">
            <input
              value={editing.caption || ''}
              onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
              className="input"
              placeholder="Festival lahzasi..."
            />
          </Labeled>

          <Labeled label="Tartib (katta — birinchi)">
            <input
              type="number"
              value={editing.sort_order || 0}
              onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
              className="input"
            />
          </Labeled>
        </EditDrawer>
      )}
    </div>
  )
}
