import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { getTelegramUser, isTelegram } from '../lib/telegram'
import XButton from '../components/XButton'

const inTelegram = isTelegram()
const CARD_NUMBER = '9999 9999 9999 9999'
const PRICE_PER_TICKET = 10000 // so'm

export default function Tickets() {
  const [step, setStep] = useState(0)   // 0=form 1=payment 2=upload 3=pending
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [preview, setPreview] = useState(null)
  const [ticketInfo, setTicketInfo] = useState(null)
  const fileRef = useRef()

  const tgUser = getTelegramUser()
  const defaultName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    : ''
  const savedPhone = sessionStorage.getItem('tg_phone') || ''

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { full_name: defaultName, phone: savedPhone, ticket_count: 1 },
  })

  // Step 0 → 1: save form data, show payment info
  const onFormSubmit = (data) => {
    setFormData({ ...data, ticket_count: Number(data.ticket_count) })
    setStep(1)
  }

  // Copy card number
  const copyCard = () => {
    navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, ''))
    toast.success('Karta raqami nusxalandi!')
  }

  // Handle file select
  const onFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setReceipt(file)
    setPreview(URL.createObjectURL(file))
  }

  // Step 2 → 3: upload receipt + notify admin
  const onUploadSubmit = async () => {
    if (!receipt) return toast.error("Iltimos chekni yuklang")
    setLoading(true)
    try {
      const ticketNum = Math.floor(10000 + Math.random() * 90000)

      // 1. Save ticket — try with new columns, fall back to basic columns
      let dbErr
      ;({ error: dbErr } = await supabase.from('tickets').insert([{
        full_name: formData.full_name,
        phone: formData.phone,
        ticket_count: formData.ticket_count,
        status: 'pending',
        chat_id: tgUser?.id || null,
        ticket_number: ticketNum,
      }]))

      if (dbErr) {
        // Fall back to basic insert (missing columns not yet added)
        ;({ error: dbErr } = await supabase.from('tickets').insert([{
          full_name: formData.full_name,
          phone: formData.phone,
          ticket_count: formData.ticket_count,
        }]))
        if (dbErr) throw dbErr
      }

      // 2. Upload receipt to Supabase Storage (non-critical)
      let receiptUrl = null
      try {
        const ext = receipt.name.split('.').pop()
        const filename = `receipt_${ticketNum}.${ext}`
        const { error: storageErr } = await supabase.storage
          .from('receipts')
          .upload(filename, receipt, { contentType: receipt.type })
        if (!storageErr) {
          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(filename)
          receiptUrl = urlData.publicUrl
        }
      } catch (_) {
        // Storage not set up yet — continue without photo
      }

      // 3. Notify admin via bot
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: tgUser?.id || null,
          username: tgUser?.username || null,
          full_name: formData.full_name,
          phone: formData.phone,
          ticket_count: formData.ticket_count,
          ticket_number: ticketNum,
          receipt_url: receiptUrl,
        }),
      })

      setTicketInfo({
        number: ticketNum,
        full_name: formData.full_name,
        username: tgUser?.username || null,
        phone: formData.phone,
        ticket_count: formData.ticket_count,
      })
      setStep(3)
    } catch (err) {
      console.error('Submit error:', err)
      toast.error("Xatolik yuz berdi. Qayta urinib ko'ring.")
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 3: Pending + Ticket card ───────────────────────────
  if (step === 3 && ticketInfo) {
    return (
      <div className="min-h-screen bg-[#F0FFF4] py-8 px-4">
        <div className="max-w-sm mx-auto">
          <XButton />

          {/* Pending banner */}
          <div className="bg-amber-500 rounded-2xl px-5 py-4 mb-5 flex items-center gap-3 shadow-lg">
            <div className="text-3xl animate-spin" style={{ animationDuration: '3s' }}>⏳</div>
            <div>
              <p className="font-bold text-white text-base">Kutilmoqda</p>
              <p className="text-amber-100 text-xs mt-0.5">Admin maqullashi kutilmoqda</p>
            </div>
          </div>

          {/* Ticket card — blurred/watermarked while pending */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">

            {/* PENDING watermark overlay */}
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-amber-400 rounded-2xl px-6 py-3 rotate-[-20deg] opacity-60">
                <p className="text-amber-400 font-black text-2xl tracking-widest uppercase">
                  Kutilmoqda
                </p>
              </div>
            </div>

            {/* Top */}
            <div className="bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] px-6 pt-8 pb-6 text-white text-center">
              <div className="text-5xl mb-3">🌿</div>
              <h1 className="text-2xl font-bold tracking-tight">Yashil Uyim</h1>
              <p className="text-green-200 text-sm">Ekologik Festival</p>
              <div className="mt-4 inline-block bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold">
                25-aprel · Toshkent
              </div>
            </div>

            {/* Dashed divider */}
            <div className="bg-white flex items-center">
              <div className="w-5 h-5 rounded-full bg-[#F0FFF4] -ml-2.5 shrink-0" />
              <div className="flex-1 border-t-2 border-dashed border-[#B7E4C7]" />
              <div className="w-5 h-5 rounded-full bg-[#F0FFF4] -mr-2.5 shrink-0" />
            </div>

            {/* Info */}
            <div className="bg-white px-6 py-6 space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Chipta №</span>
                <span className="font-bold text-[#2D6A4F] text-lg">#{ticketInfo.number}</span>
              </div>

              {[
                { icon: '👤', label: "To'liq ism", value: ticketInfo.full_name },
                ticketInfo.username && { icon: '✈️', label: 'Telegram', value: `@${ticketInfo.username}` },
                { icon: '📱', label: 'Telefon',     value: ticketInfo.phone },
                { icon: '🎫', label: 'Chipta soni', value: `${ticketInfo.ticket_count} ta` },
              ].filter(Boolean).map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 bg-[#F0FFF4] rounded-xl px-4 py-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-semibold text-[#1B2D1F]">{value}</p>
                  </div>
                </div>
              ))}

              {/* Barcode */}
              <div className="pt-2">
                <div className="flex justify-center gap-0.5">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="bg-[#2D6A4F] rounded-sm opacity-30"
                      style={{ width: i % 3 === 0 ? '3px' : '2px', height: i % 5 === 0 ? '40px' : '32px' }} />
                  ))}
                </div>
                <p className="text-center text-xs text-gray-300 mt-2">
                  #{ticketInfo.number}-YASHIL-UYIM-2026
                </p>
              </div>
            </div>

            {/* Bottom */}
            <div className="bg-amber-50 border-t border-amber-100 px-6 py-4 text-center">
              <p className="text-xs text-amber-600 font-medium">
                🤖 Admin tasdiqlagach botdan chipta keladi
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP 2: Upload receipt ───────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#F0FFF4] py-8 px-4">
        <div className="max-w-sm mx-auto">
          <XButton />

          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📎</div>
            <h2 className="text-2xl font-bold text-[#1B2D1F]">Chekni yuklang</h2>
            <p className="text-[#40916C] text-sm mt-1">To'lov cheki yoki skrinshot</p>
          </div>

          <div
            onClick={() => fileRef.current.click()}
            className="bg-white border-2 border-dashed border-[#52B788] rounded-2xl p-6 text-center cursor-pointer hover:bg-[#D8F3DC] transition-colors mb-5"
          >
            {preview ? (
              <img src={preview} alt="Chek" className="w-full max-h-64 object-contain rounded-xl" />
            ) : (
              <>
                <div className="text-5xl mb-3">🖼️</div>
                <p className="text-[#2D6A4F] font-semibold">Rasmni yuklash</p>
                <p className="text-gray-400 text-xs mt-1">JPG, PNG · max 5MB</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelect}
            />
          </div>

          {preview && (
            <button
              onClick={() => { setReceipt(null); setPreview(null) }}
              className="w-full text-sm text-gray-400 mb-3"
            >
              Boshqa rasm tanlash
            </button>
          )}

          <button
            onClick={onUploadSubmit}
            disabled={loading || !receipt}
            className="w-full bg-[#2D6A4F] text-white font-bold py-4 rounded-2xl hover:bg-[#40916C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Yuklanmoqda...' : '📤 Yuborish'}
          </button>

          <button onClick={() => setStep(1)} className="w-full text-sm text-gray-400 mt-3">
            ← Orqaga
          </button>
        </div>
      </div>
    )
  }

  // ── STEP 1: Payment info ─────────────────────────────────────
  if (step === 1) {
    const total = (formData?.ticket_count || 1) * PRICE_PER_TICKET
    return (
      <div className="min-h-screen bg-[#F0FFF4] py-8 px-4">
        <div className="max-w-sm mx-auto">
          <XButton />
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">💳</div>
            <h2 className="text-2xl font-bold text-[#1B2D1F]">To'lov</h2>
            <p className="text-[#40916C] text-sm mt-1">Quyidagi kartaga pul o'tkazing</p>
          </div>

          {/* Card */}
          <div className="bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] rounded-3xl p-6 mb-5 text-white shadow-xl">
            <p className="text-green-300 text-xs uppercase tracking-widest mb-4">Karta raqami</p>
            <p className="text-2xl font-bold tracking-widest mb-6">{CARD_NUMBER}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-green-300 text-xs">Summa</p>
                <p className="text-xl font-bold">{total.toLocaleString()} so'm</p>
              </div>
              <button
                onClick={copyCard}
                className="bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-xl text-sm font-medium"
              >
                📋 Nusxalash
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-2xl border border-[#B7E4C7] p-5 mb-5 space-y-3">
            {[
              { n: '1', text: `Kartaga ${total.toLocaleString()} so'm o'tkazing` },
              { n: '2', text: "To'lov cheki yoki skrinshot saqlang" },
              { n: '3', text: "Keyingi qadamda chekni yuklang" },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#2D6A4F] text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  {n}
                </div>
                <p className="text-sm text-[#1B2D1F]">{text}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-[#2D6A4F] text-white font-bold py-4 rounded-2xl hover:bg-[#40916C] transition-colors"
          >
            To'ladim — chekni yuklash →
          </button>
          <button onClick={() => setStep(0)} className="w-full text-sm text-gray-400 mt-3">
            ← Orqaga
          </button>
        </div>
      </div>
    )
  }

  // ── STEP 0: Registration form ────────────────────────────────
  return (
    <div className="pb-8">
      <div className="max-w-xl mx-auto">

        {/* Hero banner */}
        <div className="relative h-52 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80"
            alt="Festival"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
            <XButton />
            <span className="text-4xl mb-2">🎟️</span>
            <h1 className="text-2xl font-bold">Chipta olish</h1>
            <p className="text-green-200 text-sm mt-1">25-aprel · Toshkent</p>
          </div>
        </div>

        <div className="px-4 pt-6">
          {tgUser && (
            <div className="bg-[#D8F3DC] border border-[#B7E4C7] rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
              <span className="text-2xl">👤</span>
              <div>
                <p className="text-sm font-semibold text-[#1B2D1F]">
                  Telegram ma'lumotlari avtomatik to'ldirildi
                </p>
                <p className="text-xs text-[#40916C]">Kerak bo'lsa tahrirlashingiz mumkin</p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onFormSubmit)}
            className="bg-white rounded-2xl shadow-sm border border-[#B7E4C7] p-6 space-y-5"
          >
            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Ism <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Masalan: Akbar Toshmatov"
                {...register('full_name', {
                  required: 'Ism kiritish majburiy',
                  minLength: { value: 3, message: "Ism kamida 3 ta harf bo'lishi kerak" },
                })}
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#52B788] transition-all ${
                  errors.full_name ? 'border-red-400' : 'border-[#B7E4C7] focus:border-[#52B788]'
                }`}
              />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Tel raqam <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="+998 90 123 45 67"
                {...register('phone', {
                  required: 'Telefon raqam kiritish majburiy',
                  pattern: { value: /^\+?[0-9\s\-]{9,15}$/, message: "Telefon raqami noto'g'ri" },
                })}
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#52B788] transition-all ${
                  errors.phone ? 'border-red-400' : 'border-[#B7E4C7] focus:border-[#52B788]'
                }`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Chipta soni <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <label key={n} className="cursor-pointer">
                    <input type="radio" value={n} {...register('ticket_count')} className="sr-only peer" />
                    <div className="text-center py-3 rounded-xl border-2 border-[#B7E4C7] text-sm font-bold text-[#2D6A4F] peer-checked:bg-[#2D6A4F] peer-checked:text-white peer-checked:border-[#2D6A4F] hover:border-[#52B788] transition-all">
                      {n}
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Har bir chipta: {PRICE_PER_TICKET.toLocaleString()} so'm
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-[#2D6A4F] text-white font-semibold py-3.5 rounded-xl hover:bg-[#40916C] transition-colors text-sm"
            >
              Davom etish →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
