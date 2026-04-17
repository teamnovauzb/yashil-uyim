import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  RefreshCw, Clock, CheckCircle2, XCircle, User, Phone, Hash, Ticket, ImageOff,
  Check, X, TrendingUp, DollarSign, Search, Trash2, CheckSquare, Square,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { isSuperAdmin } from '../../lib/admins'
import ImageLightbox from '../../components/ImageLightbox'

export default function TicketsView({ initial, tgUser }) {
  const isSuper = isSuperAdmin(tgUser?.id)
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [acting, setActing]     = useState(null)
  const [tab, setTab]           = useState(initial?.tab || 'pending')
  const [lightbox, setLightbox] = useState(null)
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const prevCountRef            = useRef(0)

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('DB xato: ' + error.message)
    } else {
      const incoming = (data || []).filter(t => !t.status || t.status === 'pending')
      if (prevCountRef.current > 0 && incoming.length > prevCountRef.current) {
        toast('🎟 Yangi chipta!', { icon: '🔔' })
      }
      prevCountRef.current = incoming.length
      setTickets(data || [])
    }
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    fetchTickets()
    const interval = setInterval(() => fetchTickets(true), 10000)
    return () => clearInterval(interval)
  }, [])

  // Reset selection when changing tabs
  useEffect(() => { setSelected(new Set()) }, [tab])

  const handleAction = async (ticket, action) => {
    setActing(ticket.id)
    try {
      const res = await fetch('/api/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ticket }),
      })
      if (!res.ok) throw new Error('Server error')
      const newStatus = action === 'allow' ? 'approved' : 'fake'
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus } : t))
      if (action === 'allow') { toast.success('Tasdiqlandi!'); setTab('approved') }
      else { toast('Fake', { icon: '🚫' }); setTab('fake') }
    } catch {
      toast.error('Xatolik')
    }
    setActing(null)
  }

  const deleteOne = async (ticket) => {
    if (!isSuper) return toast.error('Faqat super admin')
    if (!confirm(`#${ticket.ticket_number || ticket.id} o'chirilsinmi?`)) return
    const { error } = await supabase.from('tickets').delete().eq('id', ticket.id)
    if (error) return toast.error(error.message)
    toast.success("O'chirildi")
    setTickets(prev => prev.filter(t => t.id !== ticket.id))
    setSelected(prev => { const n = new Set(prev); n.delete(ticket.id); return n })
  }

  const deleteSelected = async () => {
    if (!isSuper) return toast.error('Faqat super admin')
    if (selected.size === 0) return
    if (!confirm(`${selected.size} ta chipta o'chirilsinmi?`)) return
    setBulkBusy(true)
    const ids = Array.from(selected)
    const { error } = await supabase.from('tickets').delete().in('id', ids)
    setBulkBusy(false)
    if (error) return toast.error(error.message)
    toast.success(`${ids.length} ta o'chirildi`)
    setTickets(prev => prev.filter(t => !selected.has(t.id)))
    setSelected(new Set())
  }

  const toggle = (id) => setSelected(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })

  const pending  = tickets.filter(t => !t.status || t.status === 'pending')
  const approved = tickets.filter(t => t.status === 'approved')
  const faked    = tickets.filter(t => t.status === 'fake')
  const tabList = tab === 'pending' ? pending : tab === 'approved' ? approved : faked

  const list = useMemo(() => {
    if (!query.trim()) return tabList
    const q = query.toLowerCase()
    return tabList.filter(t =>
      t.full_name?.toLowerCase().includes(q) ||
      t.phone?.includes(q) ||
      String(t.ticket_number || '').includes(q) ||
      String(t.chat_id || '').includes(q)
    )
  }, [tabList, query])

  const allChecked = list.length > 0 && list.every(t => selected.has(t.id))
  const toggleAll = () => {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(list.map(t => t.id)))
  }

  const soldCount = approved.reduce((s, t) => s + (t.ticket_count || 0), 0)
  const revenue = soldCount * 10000

  const tabs = [
    { key: 'pending',  label: 'Kutilmoqda',   count: pending.length,  Icon: Clock,        color: 'amber' },
    { key: 'approved', label: 'Tasdiqlangan', count: approved.length, Icon: CheckCircle2, color: 'emerald' },
    { key: 'fake',     label: 'Fake',         count: faked.length,    Icon: XCircle,      color: 'rose' },
  ]
  const palette = {
    amber:   { text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30',   ring: 'ring-amber-400/50' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', ring: 'ring-emerald-400/50' },
    rose:    { text: 'text-rose-400',    bg: 'bg-rose-400/10',    border: 'border-rose-400/30',    ring: 'ring-rose-400/50' },
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-sm font-bold">Chiptalar</h2>
        <button
          onClick={() => fetchTickets()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sales summary */}
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-3">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/0 bg-gray-900/80 border border-emerald-500/20 p-3.5">
          <TrendingUp size={16} className="text-emerald-400" />
          <p className="text-xl font-bold text-white mt-2 tabular-nums">{soldCount}</p>
          <p className="text-[11px] text-gray-400">Sotilgan chipta</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-sky-500/20 to-sky-500/0 bg-gray-900/80 border border-sky-500/20 p-3.5">
          <DollarSign size={16} className="text-sky-400" />
          <p className="text-xl font-bold text-white mt-2 tabular-nums">{revenue.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400">So'm · daromad</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="grid grid-cols-3 gap-2.5 px-4 pb-3">
        {tabs.map(({ key, label, count, Icon, color }) => {
          const c = palette[color]
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-2xl border p-3.5 text-left transition-all ${c.bg} ${c.border} ${active ? `ring-2 ${c.ring}` : 'opacity-70 hover:opacity-100'}`}
            >
              <Icon size={16} className={`${c.text} mb-1.5`} />
              <p className={`text-2xl font-bold leading-none ${c.text}`}>{count}</p>
              <p className="text-[11px] text-gray-400 mt-1.5 truncate">{label}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ism, telefon, № yoki Chat ID..."
            className="w-full bg-gray-900/80 border border-gray-800 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* Bulk action bar (super admin only) */}
      {isSuper && list.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
          >
            {allChecked ? <CheckSquare size={14} /> : <Square size={14} />}
            {allChecked ? 'Hammasini olish' : 'Hammasini tanlash'}
          </button>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-gray-400">{selected.size} tanlangan</span>
          <div className="flex-1" />
          {selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              <Trash2 size={12} />
              {bulkBusy ? '...' : "O'chirish"}
            </button>
          )}
        </div>
      )}

      <div className="px-4">
        {loading && (
          <div className="text-center text-gray-600 py-12 flex flex-col items-center gap-2">
            <RefreshCw size={20} className="animate-spin" />
            <span className="text-xs">Yuklanmoqda...</span>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="text-center text-gray-600 py-12 text-sm">
            {query ? 'Qidiruv natijasi yo\'q' : "Ro'yxat bo'sh"}
          </div>
        )}

        <div className="space-y-3">
          {list.map((ticket, idx) => {
            const checked = selected.has(ticket.id)
            return (
              <article key={ticket.id} className={`bg-gray-900/80 rounded-2xl border overflow-hidden transition-colors ${
                checked ? 'border-rose-500/50 ring-1 ring-rose-500/30' : 'border-gray-800'
              }`}>
                <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/80">
                  <div className="flex items-center gap-2">
                    {isSuper && (
                      <button onClick={() => toggle(ticket.id)} className="text-gray-500 hover:text-white">
                        {checked ? <CheckSquare size={14} className="text-rose-400" /> : <Square size={14} />}
                      </button>
                    )}
                    <span className="text-[11px] text-gray-500 font-mono">#{idx + 1}</span>
                    {ticket.ticket_number && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">№{ticket.ticket_number}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-600">
                      {new Date(ticket.created_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isSuper && (
                      <button
                        onClick={() => deleteOne(ticket)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-rose-400 hover:bg-rose-500/10"
                        title="O'chirish"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </header>

                <dl className="grid grid-cols-2 divide-x divide-gray-800/80 border-b border-gray-800/80">
                  <Field Icon={User}   label="Ism"     value={ticket.full_name} />
                  <Field Icon={Phone}  label="Telefon" value={ticket.phone} mono />
                  <Field Icon={Ticket} label="Chipta"  value={`${ticket.ticket_count} ta`} />
                  <Field Icon={Hash}   label="Chat ID" value={ticket.chat_id || '—'} mono muted />
                </dl>

                {ticket.receipt_url ? (
                  <button
                    onClick={() => setLightbox(ticket.receipt_url)}
                    className="block w-full border-b border-gray-800/80 group bg-black"
                  >
                    <img
                      src={ticket.receipt_url}
                      alt="Chek"
                      className="w-full max-h-[480px] object-contain group-hover:opacity-90 transition-opacity"
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/80 text-gray-600 text-xs bg-gray-950/50">
                    <ImageOff size={14} /> Chek yuklanmagan
                  </div>
                )}

                {(!ticket.status || ticket.status === 'pending') ? (
                  <div className="grid grid-cols-2 divide-x divide-gray-800/80">
                    <button onClick={() => handleAction(ticket, 'allow')} disabled={acting === ticket.id}
                      className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-50">
                      <Check size={16} strokeWidth={2.5} />{acting === ticket.id ? '...' : 'Tasdiqlash'}
                    </button>
                    <button onClick={() => handleAction(ticket, 'fake')} disabled={acting === ticket.id}
                      className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-rose-400 hover:bg-rose-400/10 transition-colors disabled:opacity-50">
                      <X size={16} strokeWidth={2.5} />{acting === ticket.id ? '...' : 'Fake'}
                    </button>
                  </div>
                ) : (
                  <div className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold ${
                    ticket.status === 'approved' ? 'text-emerald-400 bg-emerald-400/5' : 'text-rose-400 bg-rose-400/5'
                  }`}>
                    {ticket.status === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {ticket.status === 'approved' ? 'Tasdiqlangan' : 'Fake'}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>

      {lightbox && (
        <ImageLightbox src={lightbox} alt="Chek" onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

function Field({ Icon, label, value, mono, muted }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        <Icon size={11} />
        <p className="text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-sm font-semibold truncate ${muted ? 'text-gray-400' : 'text-white'} ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
