import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, CalendarDays, Upload, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadImage } from '../../lib/upload'
import { EditDrawer, Labeled } from './NewsView'

const CATEGORIES = ['suhbat', 'master-klass', 'konsert', "ko'rgazma", 'boshqa']

const empty = {
  id: null, title: '', description: '', speaker: '',
  category: 'suhbat', image_url: '',
  start_time: '10:00', end_time: '11:00',
}

export default function ProgramView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('programs').select('*').order('start_time', { ascending: true })
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
      const url = await uploadImage(file, 'programs')
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
      description: editing.description?.trim() || null,
      speaker: editing.speaker?.trim() || null,
      category: editing.category || null,
      image_url: editing.image_url || null,
      start_time: editing.start_time || null,
      end_time: editing.end_time || null,
    }
    if (!payload.title) return toast.error('Nomi majburiy')

    const action = editing.id
      ? supabase.from('programs').update(payload).eq('id', editing.id)
      : supabase.from('programs').insert(payload)
    const { error } = await action
    if (error) return toast.error(error.message)
    toast.success('Saqlandi')
    setEditing(null)
    load()
  }

  const onDelete = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    const { error } = await supabase.from('programs').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success("O'chirildi")
    load()
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold">Festival dasturi ({items.length})</h2>
        <button onClick={() => setEditing({ ...empty })}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-semibold">
          <Plus size={14} /> Yangi
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-12 text-sm">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-600 py-12 text-sm">Dastur bo'sh</div>
      ) : (
        <ul className="space-y-2">
          {items.map(p => (
            <li key={p.id} className="bg-gray-900/80 rounded-2xl border border-gray-800 overflow-hidden">
              {p.image_url && (
                <img src={p.image_url} alt="" className="w-full h-32 object-cover" />
              )}
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <CalendarDays size={11} />
                    {p.start_time?.slice(0, 5)}{p.end_time && ` — ${p.end_time.slice(0, 5)}`}
                    {p.speaker && ` · ${p.speaker}`}
                  </p>
                  {p.category && (
                    <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                      {p.category}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setEditing({ ...p })}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => onDelete(p.id)}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-rose-500/20 hover:text-rose-400 text-gray-300 flex items-center justify-center">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditDrawer title={editing.id ? 'Tadbirni tahrirlash' : 'Yangi tadbir'} onClose={() => setEditing(null)} onSave={onSave}>
          <Labeled label="Rasm">
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            {editing.image_url ? (
              <div className="relative">
                <img src={editing.image_url} alt="" className="w-full h-32 object-cover rounded-xl" />
                <button type="button" onClick={() => setEditing({ ...editing, image_url: '' })}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full h-24 rounded-xl border-2 border-dashed border-gray-700 hover:border-green-500 flex flex-col items-center justify-center gap-1 text-gray-500 disabled:opacity-50">
                {uploading ? <span className="text-xs">Yuklanmoqda...</span> : <><Upload size={16} /><span className="text-xs">Rasm tanlang</span></>}
              </button>
            )}
          </Labeled>
          <Labeled label="Nomi"><input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="input" /></Labeled>
          <Labeled label="Tavsif"><textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} className="input resize-none" /></Labeled>
          <Labeled label="Ma'ruzachi"><input value={editing.speaker || ''} onChange={e => setEditing({ ...editing, speaker: e.target.value })} className="input" /></Labeled>
          <Labeled label="Kategoriya">
            <select value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} className="input">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Labeled>
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="Boshlanish"><input type="time" value={editing.start_time || ''} onChange={e => setEditing({ ...editing, start_time: e.target.value })} className="input" /></Labeled>
            <Labeled label="Tugash"><input type="time" value={editing.end_time || ''} onChange={e => setEditing({ ...editing, end_time: e.target.value })} className="input" /></Labeled>
          </div>
        </EditDrawer>
      )}
    </div>
  )
}
