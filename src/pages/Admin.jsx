import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = 'yashil2026'

export default function Admin() {
  const [authed, setAuthed]     = useState(() => sessionStorage.getItem('admin_auth') === 'true')
  const [password, setPassword] = useState('')
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [acting, setActing]     = useState(null) // ticketId being processed

  // ── Login ────────────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true')
      setAuthed(true)
    } else {
      toast.error("Parol noto'g'ri")
    }
  }

  // ── Fetch tickets ────────────────────────────────────────────
  const fetchTickets = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setTickets(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (authed) fetchTickets()
  }, [authed])

  // ── Allow / Fake ─────────────────────────────────────────────
  const handleAction = async (ticket, action) => {
    setActing(ticket.id)
    try {
      await fetch('/api/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ticket }),
      })

      // Update local status
      setTickets(prev =>
        prev.map(t => t.id === ticket.id
          ? { ...t, status: action === 'allow' ? 'approved' : 'fake' }
          : t
        )
      )
      toast.success(action === 'allow' ? '✅ Tasdiqlandi!' : '❌ Fake deb belgilandi')
    } catch {
      toast.error('Xatolik yuz berdi')
    }
    setActing(null)
  }

  // ── Login screen ─────────────────────────────────────────────
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
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Kirish
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────
  const pending  = tickets.filter(t => t.status === 'pending' || !t.status)
  const approved = tickets.filter(t => t.status === 'approved')
  const faked    = tickets.filter(t => t.status === 'fake')

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌿</span>
          <div>
            <h1 className="font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-gray-500">Yashil Uyim Festival</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTickets}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
          >
            🔄 Yangilash
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false) }}
            className="text-gray-500 hover:text-red-400 text-sm transition-colors"
          >
            Chiqish
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 px-6 py-6">
        {[
          { label: 'Kutilmoqda', count: pending.length,  color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20' },
          { label: 'Tasdiqlangan', count: approved.length, color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20' },
          { label: 'Fake',        count: faked.length,    color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-4 text-center ${bg}`}>
            <p className={`text-3xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Ticket list */}
      <div className="px-6 pb-10 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Barcha chiptalar ({tickets.length})
        </h2>

        {loading && (
          <div className="text-center text-gray-500 py-10">Yuklanmoqda...</div>
        )}

        {!loading && tickets.length === 0 && (
          <div className="text-center text-gray-600 py-10">Hali chipta yo'q</div>
        )}

        {tickets.map(ticket => {
          const isPending  = !ticket.status || ticket.status === 'pending'
          const isApproved = ticket.status === 'approved'
          const isFake     = ticket.status === 'fake'
          const isActing   = acting === ticket.id

          return (
            <div key={ticket.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">

              {/* Status bar */}
              <div className={`px-4 py-2 text-xs font-semibold flex items-center justify-between ${
                isPending  ? 'bg-amber-500/10 text-amber-400' :
                isApproved ? 'bg-green-500/10 text-green-400' :
                             'bg-red-500/10 text-red-400'
              }`}>
                <span>
                  {isPending ? '⏳ Kutilmoqda' : isApproved ? '✅ Tasdiqlangan' : '❌ Fake'}
                </span>
                <span className="text-gray-600 font-normal">
                  #{ticket.ticket_number || '—'}
                </span>
              </div>

              <div className="p-4">
                {/* User info */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-800 flex items-center justify-center text-lg shrink-0">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{ticket.full_name}</p>
                    <p className="text-sm text-gray-400">{ticket.phone}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      🎫 {ticket.ticket_count} ta ·{' '}
                      {new Date(ticket.created_at).toLocaleString('uz-UZ', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Receipt photo */}
                {ticket.receipt_url && (
                  <a href={ticket.receipt_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={ticket.receipt_url}
                      alt="Chek"
                      className="w-full max-h-52 object-cover rounded-xl mb-4 border border-gray-700 hover:opacity-90 transition-opacity"
                    />
                  </a>
                )}

                {/* Action buttons — only for pending */}
                {isPending && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAction(ticket, 'allow')}
                      disabled={isActing}
                      className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
                    >
                      {isActing ? '...' : '✅ Allow'}
                    </button>
                    <button
                      onClick={() => handleAction(ticket, 'fake')}
                      disabled={isActing}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
                    >
                      {isActing ? '...' : '❌ Fake'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
