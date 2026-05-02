import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, MapPin, Save, Sun, Moon, Languages, CreditCard } from 'lucide-react'
import { getSetting, setSetting } from '../../lib/settings'
import MapPicker from '../../components/MapPicker'
import { usePrefs } from '../../lib/prefs'
import { isSuperAdmin } from '../../lib/admins'
import { getTelegramUser } from '../../lib/telegram'

const LANGS = [
  { code: 'uz', label: "O'zbek"  },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

export default function SettingsView() {
  const [festivalDate, setFestivalDate] = useState('')
  const [festivalTime, setFestivalTime] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [card, setCard] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [price, setPrice] = useState('10000')
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const initialDateIsoRef = useRef(null)
  const { theme, setTheme, lang, setLang } = usePrefs()
  const tgUser = getTelegramUser()
  const isSuper = isSuperAdmin(tgUser?.id)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [d, addr, la, ln, cardNum, cardName, pr] = await Promise.all([
        getSetting('festival_date', '2026-04-25T09:00:00'),
        getSetting('festival_address', 'Toshkent'),
        getSetting('festival_lat', ''),
        getSetting('festival_lng', ''),
        getSetting('payment_card', '9999 9999 9999 9999'),
        getSetting('payment_card_holder', ''),
        getSetting('ticket_price', '10000'),
      ])
      if (cancelled) return
      initialDateIsoRef.current = d
      const dt = new Date(d)
      if (!isNaN(dt)) {
        const pad = (n) => String(n).padStart(2, '0')
        setFestivalDate(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`)
        setFestivalTime(`${pad(dt.getHours())}:${pad(dt.getMinutes())}`)
      }
      setAddress(addr)
      setLat(la); setLng(ln)
      setCard(cardNum); setCardHolder(cardName); setPrice(pr)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])


  const save = async (e) => {
    e.preventDefault()
    if (!festivalDate || !festivalTime) return toast.error('Sana va vaqt majburiy')
    setSaving(true)
    try {
      const iso = `${festivalDate}T${festivalTime}:00`
      const dateChanged = iso !== initialDateIsoRef.current

      await setSetting('festival_date', iso)
      await setSetting('festival_address', address.trim() || 'Toshkent')
      await setSetting('festival_lat', lat.trim())
      await setSetting('festival_lng', lng.trim())
      if (isSuper) {
        await setSetting('payment_card', card.trim() || '9999 9999 9999 9999')
        await setSetting('payment_card_holder', cardHolder.trim())
        await setSetting('ticket_price', price.trim() || '10000')
      }

      // Auto-broadcast new event announcement when the date actually changed
      if (isSuper && dateChanged) {
        try {
          const r = await fetch('/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: tgUser?.id, mode: 'event_announcement' }),
          })
          const data = await r.json()
          if (data.ok) {
            toast.success(`✅ Saqlandi · ${data.sent}/${data.recipients} foydalanuvchiga e'lon yuborildi`)
          } else {
            toast.success('Saqlandi')
            toast.error('E\'lon yuborilmadi: ' + (data.reason || 'xato'))
          }
        } catch {
          toast.success('Saqlandi')
          toast.error('E\'lon yuborishda tarmoq xatosi')
        }
        initialDateIsoRef.current = iso
      } else {
        toast.success('Saqlandi')
      }
    } catch (err) {
      toast.error(err.message || 'Xato')
    }
    setSaving(false)
  }

  if (loading) return <div className="text-center text-gray-600 py-16 text-sm">Yuklanmoqda...</div>

  const hasPin = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))

  return (
    <form onSubmit={save} className="px-4 pt-4 space-y-4">
      <h2 className="text-sm font-bold mb-2">Sozlamalar</h2>

      {/* Festival date */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={16} className="text-green-400" />
          <p className="text-sm font-semibold">Festival sanasi va vaqti</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={festivalDate} onChange={e => setFestivalDate(e.target.value)}
            className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500" />
          <input type="time" value={festivalTime} onChange={e => setFestivalTime(e.target.value)}
            className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500" />
        </div>
      </div>

      {isSuper && (
        <p className="text-[11px] text-gray-500 -mt-2 px-1 leading-relaxed">
          ℹ️ Sanani o'zgartirib saqlasangiz, barcha foydalanuvchilarga yangi tadbir haqida e'lon avtomatik yuboriladi.
        </p>
      )}

      {/* Location */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-green-400" />
          <p className="text-sm font-semibold">Tadbir joylashuvi</p>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Manzil</label>
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Masalan: Amir Temur ko'chasi 15, Toshkent"
            className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500" />
        </div>

        <button type="button" onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl">
          <MapPin size={16} />
          {lat && lng ? 'Joyni o\'zgartirish' : 'Xaritadan tanlash'}
        </button>

        {lat && lng && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Lat</label>
              <p className="bg-gray-800/50 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-300">{lat}</p>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Lng</label>
              <p className="bg-gray-800/50 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-300">{lng}</p>
            </div>
          </div>
        )}

        {hasPin && (
          <div className="rounded-xl overflow-hidden border border-gray-700">
            <iframe
              title="preview"
              className="w-full h-48"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${+lng - 0.01},${+lat - 0.005},${+lng + 0.01},${+lat + 0.005}&layer=mapnik&marker=${lat},${lng}`}
            />
          </div>
        )}
      </div>

      {/* Payment (super admin only) */}
      {isSuper && (
        <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-green-400" />
            <p className="text-sm font-semibold">To'lov sozlamalari</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold ml-auto">SUPER</span>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Karta raqami</label>
            <input
              value={card}
              onChange={e => setCard(e.target.value)}
              placeholder="9999 9999 9999 9999"
              inputMode="numeric"
              className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 font-mono tracking-wider"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Karta egasi</label>
            <input
              value={cardHolder}
              onChange={e => setCardHolder(e.target.value)}
              placeholder="A. TOSHMATOV"
              className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Chipta narxi (so'm)</label>
            <input
              value={price}
              onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="10000"
              inputMode="numeric"
              className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">Har bir chipta uchun</p>
          </div>
        </div>
      )}

      {/* Appearance */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4 space-y-4">
        <div className="flex items-center gap-2">
          {theme === 'dark' ? <Moon size={16} className="text-green-400" /> : <Sun size={16} className="text-green-400" />}
          <p className="text-sm font-semibold">Mavzu</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'light', label: "Oqish", Icon: Sun },
            { id: 'dark',  label: 'Qora',  Icon: Moon },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                theme === id
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-800/80 text-gray-300 border-gray-700'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Languages size={16} className="text-green-400" />
          <p className="text-sm font-semibold">Til</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                lang === code
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-800/80 text-gray-300 border-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
        <Save size={16} /> {saving ? 'Saqlanmoqda...' : 'Festival sozlamalarini saqlash'}
      </button>

      {showPicker && (
        <MapPicker
          initial={{ lat, lng }}
          onClose={() => setShowPicker(false)}
          onPick={({ lat, lng }) => { setLat(lat); setLng(lng) }}
        />
      )}
    </form>
  )
}
