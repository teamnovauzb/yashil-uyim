import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { getTelegramUser, isTelegram } from '../lib/telegram'
import XButton from '../components/XButton'

const inTelegram = isTelegram()

export default function Tickets() {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)

  const tgUser = getTelegramUser()
  const defaultName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    : ''
  const savedPhone = sessionStorage.getItem('tg_phone') || ''

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      full_name: defaultName,
      phone: savedPhone,
      ticket_count: 1,
    },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const { error } = await supabase.from('tickets').insert([
        {
          full_name: data.full_name,
          phone: data.phone,
          ticket_count: Number(data.ticket_count),
        },
      ])
      if (error) throw error

      // Save ticket info for display
      const ticketData = {
        full_name: data.full_name,
        username: tgUser?.username || null,
        phone: data.phone,
        ticket_count: Number(data.ticket_count),
        number: Math.floor(10000 + Math.random() * 90000),
      }
      setTicket(ticketData)
      reset()

      // Notify user and admin via bot
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: tgUser?.id || null,
            ...ticketData,
          }),
        })
      } catch (e) {
        // Notification failure is non-critical
      }

      toast.success("Ro'yxatdan muvaffaqiyatli o'tdingiz!")
    } catch (err) {
      console.error(err)
      toast.error("Xatolik yuz berdi. Qayta urinib ko'ring.")
    } finally {
      setLoading(false)
    }
  }

  if (ticket) {
    return (
      <div className="min-h-screen bg-[#F0FFF4] py-8 px-4">
        <div className="max-w-sm mx-auto">
          <XButton />

          <p className="text-center text-[#40916C] text-sm mb-6 mt-2">
            Chipta botga ham yuborildi ✅
          </p>

          {/* Ticket card */}
          <div className="rounded-3xl overflow-hidden shadow-2xl">

            {/* Top section */}
            <div className="bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] px-6 pt-8 pb-6 text-white text-center">
              <div className="text-5xl mb-3">🌿</div>
              <h1 className="text-2xl font-bold tracking-tight">Yashil Uyim</h1>
              <p className="text-green-200 text-sm">Ekologik Festival</p>
              <div className="mt-4 inline-block bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold">
                25-aprel · Toshkent
              </div>
            </div>

            {/* Dashed divider */}
            <div className="bg-white flex items-center gap-0">
              <div className="w-5 h-5 rounded-full bg-[#F0FFF4] -ml-2.5 flex-shrink-0" />
              <div className="flex-1 border-t-2 border-dashed border-[#B7E4C7]" />
              <div className="w-5 h-5 rounded-full bg-[#F0FFF4] -mr-2.5 flex-shrink-0" />
            </div>

            {/* Info section */}
            <div className="bg-white px-6 py-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Chipta №</span>
                <span className="font-bold text-[#2D6A4F] text-lg">#{ticket.number}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-[#F0FFF4] rounded-xl px-4 py-3">
                  <span className="text-xl">👤</span>
                  <div>
                    <p className="text-xs text-gray-400">To'liq ism</p>
                    <p className="font-semibold text-[#1B2D1F]">{ticket.full_name}</p>
                  </div>
                </div>

                {ticket.username && (
                  <div className="flex items-center gap-3 bg-[#F0FFF4] rounded-xl px-4 py-3">
                    <span className="text-xl">✈️</span>
                    <div>
                      <p className="text-xs text-gray-400">Telegram</p>
                      <p className="font-semibold text-[#1B2D1F]">@{ticket.username}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 bg-[#F0FFF4] rounded-xl px-4 py-3">
                  <span className="text-xl">📱</span>
                  <div>
                    <p className="text-xs text-gray-400">Telefon</p>
                    <p className="font-semibold text-[#1B2D1F]">{ticket.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#F0FFF4] rounded-xl px-4 py-3">
                  <span className="text-xl">🎫</span>
                  <div>
                    <p className="text-xs text-gray-400">Chipta soni</p>
                    <p className="font-semibold text-[#1B2D1F]">{ticket.ticket_count} ta</p>
                  </div>
                </div>
              </div>

              {/* Barcode decoration */}
              <div className="pt-2">
                <div className="flex justify-center gap-0.5">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-[#2D6A4F] rounded-sm"
                      style={{
                        width: i % 3 === 0 ? '3px' : '2px',
                        height: i % 5 === 0 ? '40px' : '32px',
                      }}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-gray-300 mt-2">
                  #{ticket.number}-YASHIL-UYIM-2026
                </p>
              </div>
            </div>

            {/* Bottom */}
            <div className="bg-[#D8F3DC] px-6 py-4 text-center">
              <p className="text-xs text-[#2D6A4F] font-medium">
                Festival kunida shu chiptani ko'rsating 🌿
              </p>
            </div>
          </div>

          <button
            onClick={() => setTicket(null)}
            className="w-full mt-6 border-2 border-[#2D6A4F] text-[#2D6A4F] font-semibold py-3 rounded-xl hover:bg-[#D8F3DC] transition-colors text-sm"
          >
            Yana ro'yxatdan o'tish
          </button>
        </div>
      </div>
    )
  }

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
            <p className="text-green-200 text-sm mt-1">25-aprel · Toshkent · Bepul</p>
          </div>
        </div>

        <div className="px-4 pt-6">
          {/* Telegram info banner */}
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
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white rounded-2xl shadow-sm border border-[#B7E4C7] p-6 space-y-5"
          >
            {/* Ism */}
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
              {errors.full_name && (
                <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>
              )}
            </div>

            {/* Tel raqam */}
            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Tel raqam <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="+998 90 123 45 67"
                {...register('phone', {
                  required: 'Telefon raqam kiritish majburiy',
                  pattern: {
                    value: /^\+?[0-9\s\-]{9,15}$/,
                    message: "Telefon raqami noto'g'ri",
                  },
                })}
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#52B788] transition-all ${
                  errors.phone ? 'border-red-400' : 'border-[#B7E4C7] focus:border-[#52B788]'
                }`}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Chipta soni */}
            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Chipta soni <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <label key={n} className="cursor-pointer">
                    <input
                      type="radio"
                      value={n}
                      {...register('ticket_count', { required: true })}
                      className="sr-only peer"
                    />
                    <div className="text-center py-3 rounded-xl border-2 border-[#B7E4C7] text-sm font-bold text-[#2D6A4F] peer-checked:bg-[#2D6A4F] peer-checked:text-white peer-checked:border-[#2D6A4F] hover:border-[#52B788] transition-all">
                      {n}
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Nechta chipta kerak? (1 dan 5 tagacha)</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D6A4F] text-white font-semibold py-3.5 rounded-xl hover:bg-[#40916C] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Yuborilmoqda...' : "🎟️ Chipta olish"}
            </button>

            <p className="text-xs text-center text-gray-400">
              Ma'lumotlaringiz faqat festival maqsadida ishlatiladi
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
