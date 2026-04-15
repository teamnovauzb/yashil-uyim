import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  RefreshCw, Clock, CheckCircle2, XCircle, User, Phone, Hash, Ticket, ImageOff, Check, X, TrendingUp, DollarSign,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function TicketsView({ initial }) {
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [acting, setActing]     = useState(null)
  const [tab, setTab]           = useState(initial?.tab || 'pending')
  const [lightbox, setLightbox] = useState(null)
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

  const pending  = tickets.filter(t => !t.status || t.status === 'pending')
  const approved = tickets.filter(t => t.status === 'approved')
  const faked    = tickets.filter(t => t.status === 'fake')
  const list = tab === 'pending' ? pending : tab === 'approved' ? approved : faked

  const soldCount   = approved.reduce((s, t) => s + (t.ticket_count || 0), 0)
  const revenue     = soldCount * 10000 // so'm (PRICE_PER_TICKET)

  const tabs = [
    { key: 'pending',  label: 'Kutilmoqda',   count: pending.length,  Icon: Clock,        color: 'amber' },
    { key: 'approved', label: 'Tasdiqlangan', count: approved.length, Icon: CheckCircle2, color: 'emerald' },
    { key: 'fake',     label: 'Fake',         count: faked.length,    Icon: XCircle,      color: 'rose' },
  ]
  const palette = {
    amber:   'text-amber-400 bg-amber-400/10 border-amber-400/30 ring-amber-400/50',
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30 ring-emerald-400/50',
    rose:    'text-rose-400 bg-rose-400/10 border-rose-400/30 ring-rose-400/50',
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

      <div className="grid grid-cols-3 gap-2.5 px-4 pb-4">
        {tabs.map(({ key, label, count, Icon, color }) => {
          const cls = palette[color]
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-2xl border p-3.5 text-left transition-all ${cls.replace('ring-', 'ring-').split(' ').slice(0, 3).join(' ')} ${active ? `ring-2 ${cls.split(' ').find(c => c.startsWith('ring-'))}` : 'opacity-70 hover:opacity-100'}`}
            >
              <Icon size={16} className={cls.split(' ')[0] + ' mb-1.5'} />
              <p className={`text-2xl font-bold leading-none ${cls.split(' ')[0]}`}>{count}</p>
              <p className="text-[11px] text-gray-400 mt-1.5 truncate">{label}</p>
            </button>
          )
        })}
      </div>

      <div className="px-4">
        {loading && (
          <div className="text-center text-gray-600 py-12 flex flex-col items-center gap-2">
            <RefreshCw size={20} className="animate-spin" />
            <span className="text-xs">Yuklanmoqda...</span>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="text-center text-gray-600 py-12 text-sm">Ro'yxat bo'sh</div>
        )}

        <div className="space-y-3">
          {list.map((ticket, idx) => (
            <article key={ticket.id} className="bg-gray-900/80 rounded-2xl border border-gray-800 overflow-hidden">
              <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 font-mono">#{idx + 1}</span>
                  {ticket.ticket_number && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">№{ticket.ticket_number}</span>
                  )}
                </div>
                <span className="text-[11px] text-gray-600">
                  {new Date(ticket.created_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </header>

              <dl className="grid grid-cols-2 divide-x divide-gray-800/80 border-b border-gray-800/80">
                <Field Icon={User}   label="Ism"         value={ticket.full_name} />
                <Field Icon={Phone}  label="Telefon"     value={ticket.phone} mono />
                <Field Icon={Ticket} label="Chipta"      value={`${ticket.ticket_count} ta`} />
                <Field Icon={Hash}   label="Chat ID"     value={ticket.chat_id || '—'} mono muted />
              </dl>

              {ticket.receipt_url ? (
                <button onClick={() => setLightbox(ticket.receipt_url)} className="block w-full border-b border-gray-800/80 group">
                  <img src={ticket.receipt_url} alt="Chek" className="w-full max-h-56 object-cover group-hover:opacity-90 transition-opacity" />
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
          ))}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><X size={20} /></button>
          <img src={lightbox} alt="Chek" className="max-w-full max-h-full object-contain" />
        </div>
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
