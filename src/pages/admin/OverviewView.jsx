import { useEffect, useState } from 'react'
import { Users, Ticket, Clock, CheckCircle2, XCircle, Newspaper, CalendarDays, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function OverviewView({ setView }) {
  const [stats, setStats]   = useState(null)
  const [signups, setSignups] = useState([])
  const [salesSeries, setSalesSeries] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [usersRes, ticketsRes, newsRes, progRes] = await Promise.all([
        supabase.from('users').select('telegram_id, created_at'),
        supabase.from('tickets').select('id, status, ticket_count, created_at'),
        supabase.from('news').select('id'),
        supabase.from('programs').select('id'),
      ])
      if (cancelled) return
      const users = usersRes.data || []
      const tickets = ticketsRes.data || []
      const pending = tickets.filter(t => !t.status || t.status === 'pending')
      const approved = tickets.filter(t => t.status === 'approved')
      const fake = tickets.filter(t => t.status === 'fake')
      const sold = approved.reduce((sum, t) => sum + (t.ticket_count || 0), 0)

      setStats({
        users: users.length, tickets: tickets.length,
        pending: pending.length, approved: approved.length, fake: fake.length,
        sold, news: (newsRes.data || []).length, programs: (progRes.data || []).length,
      })

      const days = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
        days.push(d)
      }
      const countPer = (src, day) => {
        const next = new Date(day); next.setDate(next.getDate() + 1)
        return src.filter(x => {
          const c = new Date(x.created_at); return c >= day && c < next
        }).length
      }
      setSignups(days.map(d => ({ day: d, count: countPer(users, d) })))
      setSalesSeries(days.map(d => ({ day: d, count: countPer(approved, d) })))
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (!stats) {
    return <div className="text-center text-gray-600 py-16 text-sm">Yuklanmoqda...</div>
  }

  const go = (view, payload) => () => setView?.(view, payload)

  return (
    <div className="px-4 pt-4 space-y-4 pb-4">

      {/* Hero KPI */}
      <div className="grid grid-cols-2 gap-3">
        <HeroCard label="Foydalanuvchilar" value={stats.users}
                  trend={signups.slice(-7).reduce((s,d)=>s+d.count,0)} trendLabel="7 kun"
                  Icon={Users} accent="emerald" onClick={go('profile')} />
        <HeroCard label="Sotilgan chipta" value={stats.sold}
                  trend={salesSeries.slice(-7).reduce((s,d)=>s+d.count,0)} trendLabel="7 kun"
                  Icon={TrendingUp} accent="sky" onClick={go('tickets', { tab: 'approved' })} />
      </div>

      {/* Trend area chart */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-white">14 kunlik trend</p>
            <p className="text-[11px] text-gray-500">Ro'yxatdan o'tish va chipta tasdiqlash</p>
          </div>
        </div>
        <AreaChart signups={signups} sales={salesSeries} />
        <div className="flex items-center justify-center gap-4 mt-3 text-[11px]">
          <LegendDot color="#22c55e" label="Users" />
          <LegendDot color="#38bdf8" label="Chipta" />
        </div>
      </div>

      {/* Ticket status donut */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-white">Chiptalar holati</p>
            <p className="text-[11px] text-gray-500">Jami: {stats.tickets}</p>
          </div>
        </div>
        <DonutChart
          data={[
            { label: 'Kutilmoqda',   value: stats.pending,  color: '#f59e0b', onClick: go('tickets', { tab: 'pending' }) },
            { label: 'Tasdiqlangan', value: stats.approved, color: '#10b981', onClick: go('tickets', { tab: 'approved' }) },
            { label: 'Fake',         value: stats.fake,     color: '#f43f5e', onClick: go('tickets', { tab: 'fake' }) },
          ]}
        />
      </div>

      {/* Detailed stat cards (clickable) */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Batafsil</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard Icon={Ticket}       label="Jami chiptalar"   value={stats.tickets}  accent="sky"     onClick={go('tickets')} />
          <StatCard Icon={Clock}        label="Kutilmoqda"       value={stats.pending}  accent="amber"   onClick={go('tickets', { tab: 'pending' })} />
          <StatCard Icon={CheckCircle2} label="Tasdiqlangan"     value={stats.approved} accent="emerald" onClick={go('tickets', { tab: 'approved' })} />
          <StatCard Icon={XCircle}      label="Fake"             value={stats.fake}     accent="rose"    onClick={go('tickets', { tab: 'fake' })} />
          <StatCard Icon={Newspaper}    label="Yangiliklar"      value={stats.news}     accent="sky"     onClick={go('events')} />
          <StatCard Icon={CalendarDays} label="Dastur"           value={stats.programs} accent="violet"  onClick={go('events')} />
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Charts

function AreaChart({ signups, sales }) {
  const W = 320, H = 130, PAD = 8
  const max = Math.max(1, ...signups.map(s => s.count), ...sales.map(s => s.count))
  const stepX = (W - PAD * 2) / (signups.length - 1)

  const pathFor = (data) => {
    const pts = data.map((d, i) => {
      const x = PAD + i * stepX
      const y = H - PAD - (d.count / max) * (H - PAD * 2)
      return [x, y]
    })
    const line = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ')
    const area = `${line} L${pts[pts.length - 1][0]},${H - PAD} L${pts[0][0]},${H - PAD} Z`
    return { line, area }
  }

  const a = pathFor(signups)
  const b = pathFor(sales)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32">
      <defs>
        <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#22c55e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1={PAD} x2={W - PAD} y1={PAD + (H - PAD * 2) * p} y2={PAD + (H - PAD * 2) * p}
              stroke="#1f2937" strokeWidth="1" strokeDasharray="2 3" />
      ))}
      <path d={a.area} fill="url(#gA)" />
      <path d={b.area} fill="url(#gB)" />
      <path d={a.line} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={b.line} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const R = 58, r = 38, C = 2 * Math.PI * R
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="-80 -80 160 160" className="w-36 h-36 -rotate-90 shrink-0">
        <circle r={R} fill="none" stroke="#1f2937" strokeWidth={R - r} />
        {total > 0 && data.map((d) => {
          if (!d.value) return null
          const frac = d.value / total
          const dash = C * frac
          const el = (
            <circle
              key={d.label}
              r={R} fill="none"
              stroke={d.color}
              strokeWidth={R - r}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              style={{ cursor: d.onClick ? 'pointer' : 'default' }}
              onClick={d.onClick}
            />
          )
          offset += dash
          return el
        })}
        <text x="0" y="5" textAnchor="middle" fill="white" className="rotate-90 origin-center"
              style={{ transform: 'rotate(90deg)', fontSize: '1.1rem', fontWeight: 700 }}>
          {total}
        </text>
      </svg>
      <ul className="flex-1 min-w-0 space-y-1.5">
        {data.map((d) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0
          return (
            <li key={d.label}>
              <button onClick={d.onClick} className="w-full flex items-center gap-2 hover:bg-gray-800/50 rounded-lg p-1.5 -m-1.5 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-gray-300 flex-1 text-left truncate">{d.label}</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: d.color }}>{d.value}</span>
                <span className="text-[10px] text-gray-500 tabular-nums w-8 text-right">{pct}%</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-gray-400">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────
// Cards

const accentMap = {
  emerald: { bg: 'from-emerald-500/20 to-emerald-500/0', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  sky:     { bg: 'from-sky-500/20 to-sky-500/0',         border: 'border-sky-500/20',     text: 'text-sky-400' },
  amber:   { bg: 'from-amber-500/20 to-amber-500/0',     border: 'border-amber-500/20',   text: 'text-amber-400' },
  rose:    { bg: 'from-rose-500/20 to-rose-500/0',       border: 'border-rose-500/20',    text: 'text-rose-400' },
  violet:  { bg: 'from-violet-500/20 to-violet-500/0',   border: 'border-violet-500/20',  text: 'text-violet-400' },
}

function HeroCard({ Icon, label, value, trend, trendLabel, accent, onClick }) {
  const c = accentMap[accent] || accentMap.emerald
  return (
    <button onClick={onClick}
      className={`text-left bg-gradient-to-br ${c.bg} bg-gray-900/80 rounded-2xl border ${c.border} p-4 active:scale-[0.98] transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className={c.text} />
        {trend > 0 && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${c.text}`}>
            ↑ {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-gray-400 mt-1.5">{label}</p>
      {trend > 0 && <p className="text-[10px] text-gray-500 mt-0.5">+{trend} · {trendLabel}</p>}
    </button>
  )
}

function StatCard({ Icon, label, value, accent, onClick }) {
  const c = accentMap[accent] || accentMap.emerald
  return (
    <button onClick={onClick}
      className={`text-left bg-gradient-to-br ${c.bg} bg-gray-900/80 rounded-2xl border ${c.border} p-4 active:scale-[0.98] transition-all`}>
      <Icon size={18} className={c.text} />
      <p className="text-2xl font-bold text-white mt-2 tabular-nums">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
    </button>
  )
}
