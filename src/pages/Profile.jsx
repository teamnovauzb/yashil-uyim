import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, IdCard, BadgeCheck, Ticket, Newspaper, MessageSquare, Sun, Moon, Languages, QrCode } from 'lucide-react'
import { getTelegramUser, isTelegram } from '../lib/telegram'
import { getCachedPhone, isContacted, loadContactFromDb, markContacted } from '../lib/contact'
import { supabase } from '../lib/supabase'
import { usePrefs, useT } from '../lib/prefs'
import FeedbackPanel from '../components/FeedbackPanel'
import ImageLightbox from '../components/ImageLightbox'

const LANGS = [
  { code: 'uz', label: "O'zbek"  },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

export default function Profile() {
  const tgUser = getTelegramUser()
  const inTg = isTelegram()
  const { theme, setTheme, lang, setLang } = usePrefs()
  const t = useT()
  const [phone, setPhone] = useState(getCachedPhone(tgUser))
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrLightbox, setQrLightbox] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!phone && tgUser?.id) {
        const dbPhone = await loadContactFromDb(tgUser)
        if (!cancelled && dbPhone) { markContacted(tgUser, dbPhone); setPhone(dbPhone) }
      }
      if (tgUser?.id) {
        // Try the embedded query first (per-seat QRs). Fall back to a flat
        // query if the ticket_seats table / FK doesn't exist yet (pre-migration).
        const withSeats = await supabase
          .from('tickets')
          .select('id, ticket_number, full_name, ticket_count, status, qr_url, checked_in_count, created_at, ticket_seats(seat_index, qr_url, checked_in_at)')
          .eq('chat_id', tgUser.id)
          .order('created_at', { ascending: false })
        if (withSeats.error) {
          const { data } = await supabase
            .from('tickets')
            .select('id, ticket_number, full_name, ticket_count, status, qr_url, checked_in_count, created_at')
            .eq('chat_id', tgUser.id)
            .order('created_at', { ascending: false })
          if (!cancelled) setTickets(data || [])
        } else if (!cancelled) {
          setTickets(withSeats.data || [])
        }
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [tgUser?.id])

  const fullName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    : t('guest')

  return (
    <div className="min-h-screen bg-[#F0FFF4] pb-8">
      <div className="bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] text-white px-6 pt-10 pb-16 text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-4xl mx-auto mb-3">
          {tgUser?.first_name?.[0]?.toUpperCase() || '👤'}
        </div>
        <h1 className="text-xl font-bold">{fullName}</h1>
        {tgUser?.username && <p className="text-green-200 text-sm">@{tgUser.username}</p>}
      </div>

      <div className="max-w-md mx-auto px-4 -mt-10">
        {/* Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#B7E4C7] p-5 mb-5 space-y-3">
          <Row Icon={Phone} label={t('phone')} value={phone || t('notShared')} />
          {tgUser?.id && <Row Icon={IdCard} label="Telegram ID" value={String(tgUser.id)} />}
          <Row Icon={BadgeCheck} label={t('status')} value={isContacted(tgUser) ? t('verified') : t('guest')} />
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#B7E4C7] p-5 mb-5">
          <p className="text-[11px] font-semibold text-[#40916C] uppercase tracking-wider mb-3">{t('settings')}</p>

          {/* Theme */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-[#1B2D1F]">
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              {t('theme')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'light', label: t('light'), Icon: Sun },
                { id: 'dark',  label: t('dark'),  Icon: Moon },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                    theme === id
                      ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                      : 'bg-[#F0FFF4] text-[#2D6A4F] border-[#B7E4C7]'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-[#1B2D1F]">
              <Languages size={16} />
              {t('language')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                    lang === code
                      ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                      : 'bg-[#F0FFF4] text-[#2D6A4F] border-[#B7E4C7]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!inTg && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-700">
            Telegram orqali kirilganda ko'proq funksiyalar mavjud.
          </div>
        )}

        {/* Tickets */}
        <div className="mb-5">
          <h2 className="text-sm font-bold text-[#1B2D1F] mb-3 px-1">{t('myTickets')}</h2>
          {loading ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">...</div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-[#B7E4C7]">
              <div className="w-12 h-12 rounded-xl bg-[#D8F3DC] flex items-center justify-center mx-auto mb-3 text-[#2D6A4F]">
                <Ticket size={22} />
              </div>
              <p className="text-gray-500 text-sm mb-4">{t('noTickets')}</p>
              <Link
                to="/chipta"
                className="inline-block bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#40916C] transition-colors"
              >
                {t('buyTicket')}
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {tickets.map((tk) => {
                const checkedIn = tk.checked_in_count || 0
                const seats = Array.isArray(tk.ticket_seats)
                  ? [...tk.ticket_seats].sort((a, b) => a.seat_index - b.seat_index)
                  : []
                const hasSeats = seats.length > 0
                return (
                  <li key={tk.ticket_number} className="bg-white rounded-2xl p-4 border border-[#B7E4C7]">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#2D6A4F]">#{tk.ticket_number}</p>
                        <p className="text-xs text-gray-400">{tk.ticket_count} · {tk.full_name}</p>
                        {tk.status === 'approved' && checkedIn > 0 && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            {checkedIn}/{tk.ticket_count} kirgan
                          </p>
                        )}
                      </div>
                      {tk.status === 'approved' && !hasSeats && tk.qr_url && (
                        <button
                          onClick={() => setQrLightbox({ src: tk.qr_url, alt: `Chipta #${tk.ticket_number}` })}
                          className="w-10 h-10 rounded-xl bg-[#D8F3DC] text-[#2D6A4F] flex items-center justify-center shrink-0"
                          aria-label="QR kodni ko'rish"
                        >
                          <QrCode size={18} />
                        </button>
                      )}
                      <StatusBadge status={tk.status} />
                    </div>

                    {tk.status === 'approved' && hasSeats && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {seats.map((s) => {
                          const used = !!s.checked_in_at
                          return (
                            <button
                              key={s.seat_index}
                              onClick={() => s.qr_url && setQrLightbox({ src: s.qr_url, alt: `#${tk.ticket_number} · QR ${s.seat_index}/${tk.ticket_count}` })}
                              disabled={!s.qr_url}
                              className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                used
                                  ? 'bg-gray-100 border-gray-200 text-gray-400'
                                  : 'bg-[#D8F3DC] border-[#B7E4C7] text-[#2D6A4F] hover:bg-[#B7E4C7]'
                              }`}
                            >
                              <QrCode size={20} className={used ? 'opacity-50' : ''} />
                              <span className="text-[10px] font-bold">
                                {s.seat_index}/{tk.ticket_count}
                              </span>
                              {used && (
                                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                  ✓
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <Link
          to="/yangiliklar"
          className="block bg-white rounded-2xl p-4 border border-[#B7E4C7] text-center mb-5"
        >
          <Newspaper size={22} className="mx-auto mb-1 text-[#2D6A4F]" />
          <p className="text-xs font-semibold text-[#1B2D1F]">{t('news')}</p>
        </Link>

        {/* Talab va Takliflar */}
        <div className="mb-5">
          <h2 className="text-sm font-bold text-[#1B2D1F] mb-3 px-1 flex items-center gap-2">
            <MessageSquare size={16} className="text-[#2D6A4F]" />
            Talab va Takliflar
          </h2>
          <FeedbackPanel />
        </div>
      </div>

      {qrLightbox && (
        <ImageLightbox src={qrLightbox.src} alt={qrLightbox.alt} onClose={() => setQrLightbox(null)} />
      )}
    </div>
  )
}

function Row({ Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#D8F3DC] flex items-center justify-center text-[#2D6A4F] shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-[#1B2D1F] truncate">{value}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    approved: { text: 'Tasdiqlangan', cls: 'bg-green-100 text-green-700' },
    pending:  { text: 'Kutilmoqda',   cls: 'bg-amber-100 text-amber-700' },
    fake:     { text: 'Rad etilgan',  cls: 'bg-red-100 text-red-700' },
  }
  const s = map[status] || { text: status || '—', cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>{s.text}</span>
}
