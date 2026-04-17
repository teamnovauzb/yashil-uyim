import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MessageSquare, Send, CheckCircle2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function FeedbackList({ tgUser }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply]   = useState({})    // id -> draft text
  const [busy, setBusy]     = useState(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const send = async (item) => {
    const text = (reply[item.id] || '').trim()
    if (!text) return toast.error('Javob matni kiritilmagan')
    setBusy(item.id)
    try {
      const res = await fetch('/api/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reply',
          id: item.id,
          reply: text,
          chat_id: item.chat_id,
          replied_by: tgUser?.id || null,
        }),
      })
      if (!res.ok) throw new Error('Server error')
      toast.success('Javob yuborildi')
      setReply((r) => ({ ...r, [item.id]: '' }))
      load()
    } catch {
      toast.error('Xatolik yuz berdi')
    }
    setBusy(null)
  }

  const pending  = items.filter(i => !i.reply)
  const answered = items.filter(i => i.reply)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare size={14} className="text-green-400" />
          Talab va Takliflar
        </p>
        <button onClick={load}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && (
        <div className="text-center text-gray-600 py-6 text-xs">Yuklanmoqda...</div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center text-gray-600 py-6 text-xs">Ro'yxat bo'sh</div>
      )}

      {pending.length > 0 && (
        <Section title={`Javob kutmoqda (${pending.length})`} accent="amber">
          <ul className="space-y-2.5">
            {pending.map((it) => (
              <Card key={it.id} item={it}>
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Javobingizni yozing..."
                    value={reply[it.id] || ''}
                    onChange={(e) => setReply((r) => ({ ...r, [it.id]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-green-500 resize-none"
                  />
                  <button
                    onClick={() => send(it)}
                    disabled={busy === it.id}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                  >
                    <Send size={12} />
                    {busy === it.id ? '...' : 'Javob yuborish'}
                  </button>
                </div>
              </Card>
            ))}
          </ul>
        </Section>
      )}

      {answered.length > 0 && (
        <Section title={`Javob berilgan (${answered.length})`} accent="emerald">
          <ul className="space-y-2.5">
            {answered.map((it) => (
              <Card key={it.id} item={it}>
                <div className="bg-gray-950/40 border border-gray-800 rounded-lg p-2.5 flex gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {it.reply}
                  </p>
                </div>
              </Card>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function Section({ title, accent, children }) {
  const colors = {
    amber:   'text-amber-400',
    emerald: 'text-emerald-400',
  }
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${colors[accent]}`}>{title}</p>
      {children}
    </div>
  )
}

function Card({ item, children }) {
  return (
    <li className="bg-gray-800/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white truncate">{item.full_name || '—'}</p>
        <span className="text-[10px] text-gray-500">
          {new Date(item.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{item.message}</p>
      {item.chat_id && (
        <p className="text-[10px] text-gray-600 font-mono">Chat ID: {item.chat_id}</p>
      )}
      {children}
    </li>
  )
}
