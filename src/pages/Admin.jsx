import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { getTelegramUser } from '../lib/telegram'

const ADMIN_PASSWORD = 'yashil2026'
const ADMIN_ID = 5803735374

export default function Admin() {
  const tgUser = getTelegramUser()
  const isTgAdmin = tgUser?.id === ADMIN_ID

  const [authed, setAuthed]     = useState(() => isTgAdmin || sessionStorage.getItem('admin_auth') === 'true')
  const [password, setPassword] = useState('')
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [acting, setActing]     = useState(null)
  const [tab, setTab]           = useState('pending')  // pending | approved | fake
  const prevCountRef            = useRef(0)

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true')
      setAuthed(true)
    } else {
      toast.error("Parol noto'g'ri")
    }
  }

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
        toast('🎟 Yangi chipta keldi!', { icon: '🔔' })
      }
      prevCountRef.current = incoming.length
      setTickets(data || [])
    }
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    if (!authed) return
    fetchTickets()
    const interval = setInterval(() => fetchTickets(true), 10000)
    return () => clearInterval(interval)
  }, [authed])

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
      setTickets(prev =>
        prev.map(t => t.id === ticket.id ? { ...t, status: newStatus } : t)
      )
      if (action === 'allow') {
        toast.success('✅ Tasdiqlandi! Foydalanuvchi dashboardga o\'tkazildi.')
        setTab('approved')
      } else {
        toast('❌ Fake deb belgilandi', { icon: '🚫' })
        setTab('fake')
      }
    } catch {
      toast.error('Xatolik yuz berdi')
    }
    setActing(null)
  }

  // ── Login ─────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm border border-gray-800 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-500 text-sm mt-1">Yashil Uyim</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Parol"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
            />
            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors">
              Kirish
            </button>
          </form>
        </div>
      </div>
    )
  }

  const pending  = tickets.filter(t => !t.status || t.status === 'pending')
  const approved = tickets.filter(t => t.status === 'approved')
  const faked    = tickets.filter(t => t.status === 'fake')

  const tabTickets = tab === 'pending' ? pending : tab === 'approved' ? approved : faked

  // ── Dashboard ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌿</span>
          <span className="font-bold text-white">Admin Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchTickets()} className="text-gray-400 hover:text-white text-sm transition-colors">
            🔄
          </button>
          <button onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false) }} className="text-gray-500 hover:text-red-400 text-sm transition-colors">
            Chiqish
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 py-4">
        {[
          { key: 'pending',  label: 'Kutilmoqda',   count: pending.length,  color: 'text-amber-400',  border: 'border-amber-400/30 bg-amber-400/10' },
          { key: 'approved', label: 'Tasdiqlangan', count: approved.length, color: 'text-green-400',  border: 'border-green-400/30 bg-green-400/10' },
          { key: 'fake',     label: 'Fake',          count: faked.length,    color: 'text-red-400',    border: 'border-red-400/30 bg-red-400/10' },
        ].map(({ key, label, count, color, border }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-2xl border p-3 text-center transition-all ${border} ${tab === key ? 'ring-2 ring-white/20' : ''}`}
          >
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="px-4 pb-10">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          {tab === 'pending' ? 'Tasdiqlash kerak' : tab === 'approved' ? 'Tasdiqlangan' : 'Fake'} ({tabTickets.length})
        </h2>

        {loading && <div className="text-center text-gray-600 py-10">Yuklanmoqda...</div>}
        {!loading && tabTickets.length === 0 && (
          <div className="text-center text-gray-600 py-10">Ro'yxat bo'sh</div>
        )}

        <div className="space-y-3">
          {tabTickets.map((ticket, idx) => (
            <div key={ticket.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">

              {/* Row header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                <span className="text-xs text-gray-500">#{idx + 1} · {ticket.ticket_number ? `№${ticket.ticket_number}` : '—'}</span>
                <span className="text-xs text-gray-600">
                  {new Date(ticket.created_at).toLocaleString('uz-UZ', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-0 divide-x divide-gray-800 border-b border-gray-800">
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Ism</p>
                  <p className="text-sm font-semibold text-white truncate">{ticket.full_name}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Telefon</p>
                  <p className="text-sm font-semibold text-white">{ticket.phone}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Chipta soni</p>
                  <p className="text-sm font-semibold text-white">{ticket.ticket_count} ta</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Chat ID</p>
                  <p className="text-sm text-gray-400">{ticket.chat_id || '—'}</p>
                </div>
              </div>

              {/* Receipt photo */}
              {ticket.receipt_url && (
                <a href={ticket.receipt_url} target="_blank" rel="noopener noreferrer" className="block border-b border-gray-800">
                  <img
                    src={ticket.receipt_url}
                    alt="Chek"
                    className="w-full max-h-48 object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              )}

              {/* Action buttons */}
              {(!ticket.status || ticket.status === 'pending') && (
                <div className="grid grid-cols-2 divide-x divide-gray-800">
                  <button
                    onClick={() => handleAction(ticket, 'allow')}
                    disabled={acting === ticket.id}
                    className="py-3.5 text-sm font-bold text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-50"
                  >
                    {acting === ticket.id ? '...' : '✅ Tasdiqlash'}
                  </button>
                  <button
                    onClick={() => handleAction(ticket, 'fake')}
                    disabled={acting === ticket.id}
                    className="py-3.5 text-sm font-bold text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                  >
                    {acting === ticket.id ? '...' : '❌ Fake'}
                  </button>
                </div>
              )}

              {/* Status badge for non-pending */}
              {ticket.status && ticket.status !== 'pending' && (
                <div className={`px-4 py-3 text-center text-sm font-semibold ${
                  ticket.status === 'approved' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {ticket.status === 'approved' ? '✅ Tasdiqlangan' : '❌ Fake'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
