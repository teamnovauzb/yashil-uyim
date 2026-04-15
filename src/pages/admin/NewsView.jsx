import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Newspaper, X, Save, Upload, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadImage } from '../../lib/upload'

const empty = { id: null, title: '', content: '', image_url: '' }

export default function NewsView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('news').select('*').order('published_at', { ascending: false })
    if (error) toast.error(error.message)
    else setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, 'news')
      setEditing((prev) => ({ ...prev, image_url: url }))
      toast.success('Rasm yuklandi')
    } catch (err) {
      toast.error(err.message || 'Upload xato')
    }
    setUploading(false)
  }

  const onSave = async (e) => {
    e.preventDefault()
    const payload = {
      title: editing.title.trim(),
      content: editing.content.trim(),
      image_url: editing.image_url || null,
    }
    if (!payload.title || !payload.content) return toast.error('Sarlavha va matn majburiy')

    const action = editing.id
      ? supabase.from('news').update(payload).eq('id', editing.id)
      : supabase.from('news').insert({ ...payload, published_at: new Date().toISOString() })
    const { error } = await action
    if (error) return toast.error(error.message)
    toast.success('Saqlandi')
    setEditing(null)
    load()
  }

  const onDelete = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    const { error } = await supabase.from('news').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success("O'chirildi")
    load()
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold">Yangiliklar ({items.length})</h2>
        <button onClick={() => setEditing({ ...empty })}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-semibold">
          <Plus size={14} /> Yangi
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-12 text-sm">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-600 py-12 text-sm">Yangiliklar yo'q</div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((n) => (
            <li key={n.id} className="bg-gray-900/80 rounded-2xl border border-gray-800 p-3 flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                {n.image_url
                  ? <img src={n.image_url} alt="" className="w-full h-full object-cover" />
                  : <Newspaper size={20} className="text-gray-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {new Date(n.published_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">{n.content}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => setEditing({ ...n })}
                  className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center">
                  <Pencil size={13} />
                </button>
                <button onClick={() => onDelete(n.id)}
                  className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-rose-500/20 hover:text-rose-400 text-gray-300 flex items-center justify-center">
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditDrawer
          title={editing.id ? 'Tahrirlash' : 'Yangi yangilik'}
          onClose={() => setEditing(null)}
          onSave={onSave}
        >
          <Labeled label="Rasm">
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            {editing.image_url ? (
              <div className="relative">
                <img src={editing.image_url} alt="" className="w-full h-36 object-cover rounded-xl" />
                <button type="button" onClick={() => setEditing({ ...editing, image_url: '' })}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full h-28 rounded-xl border-2 border-dashed border-gray-700 hover:border-green-500 hover:bg-gray-800/50 flex flex-col items-center justify-center gap-1.5 text-gray-500 transition-colors disabled:opacity-50">
                {uploading ? (
                  <span className="text-xs">Yuklanmoqda...</span>
                ) : (
                  <>
                    <Upload size={18} />
                    <span className="text-xs">Rasm tanlang</span>
                  </>
                )}
              </button>
            )}
          </Labeled>
          <Labeled label="Sarlavha">
            <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="input" />
          </Labeled>
          <Labeled label="Matn">
            <textarea value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })} rows={6} className="input resize-none" />
          </Labeled>
        </EditDrawer>
      )}
    </div>
  )
}

export function EditDrawer({ title, children, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <form
        onSubmit={onSave}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-800 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="space-y-3">{children}</div>
        <button type="submit" className="mt-5 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl">
          <Save size={16} /> Saqlash
        </button>
      </form>
      <style>{`
        .input { width: 100%; background: rgba(31,41,55,0.8); border: 1px solid rgb(55,65,81); color: white; border-radius: 0.75rem; padding: 0.75rem 0.9rem; font-size: 0.85rem; outline: none; }
        .input:focus { border-color: rgb(34,197,94); }
      `}</style>
    </div>
  )
}

export function Labeled({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}
