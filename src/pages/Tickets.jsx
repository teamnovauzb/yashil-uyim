import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { getTelegramUser, isTelegram, requestPhone } from '../lib/telegram'
import XButton from '../components/XButton'

const inTelegram = isTelegram()

export default function Tickets() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const tgUser = getTelegramUser()
  const defaultName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    : ''

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      full_name: defaultName,
      phone: '',
      ticket_count: 1,
    },
  })

  // Auto-request phone when Mini App opens in Telegram
  useEffect(() => {
    if (!inTelegram) return
    requestPhone((phone) => {
      setValue('phone', phone, { shouldValidate: true })
    })
  }, [])

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
      setSubmitted(true)
      reset()
      toast.success("Ro'yxatdan muvaffaqiyatli o'tdingiz!")
    } catch (err) {
      console.error(err)
      toast.error("Xatolik yuz berdi. Qayta urinib ko'ring.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-xl mx-auto">

        <XButton />

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🎟️</span>
          <h1 className="text-3xl font-bold text-[#1B2D1F] mb-2">Chipta olish</h1>
          <p className="text-[#40916C]">
            Festival bepul. Faqat ro'yxatdan o'tish talab etiladi. Joylar cheklangan!
          </p>
        </div>

        {/* Telegram info banner */}
        {tgUser && !submitted && (
          <div className="bg-[#D8F3DC] border border-[#B7E4C7] rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-2xl">👤</span>
            <div>
              <p className="text-sm font-semibold text-[#1B2D1F]">
                Telegram ma'lumotlari avtomatik to'ldirildi
              </p>
              <p className="text-xs text-[#40916C]">Kerak bo'lsa tahrirlashingiz mumkin</p>
            </div>
          </div>
        )}

        {submitted ? (
          <div className="bg-green-50 border border-[#52B788] rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-[#2D6A4F] mb-2">Tabriklaymiz!</h2>
            <p className="text-[#40916C] mb-6">
              Siz muvaffaqiyatli ro'yxatdan o'tdingiz. Festival kunida sizni kutib qolamiz!
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="bg-[#2D6A4F] text-white px-6 py-2 rounded-lg hover:bg-[#40916C] transition-colors font-medium"
            >
              Yana ro'yxatdan o'tish
            </button>
          </div>
        ) : (
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
              {inTelegram && (
                <p className="text-xs text-[#40916C] mt-1">
                  📱 Telegram telefon raqamingiz avtomatik to'ldirilmoqda...
                </p>
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
              {loading ? 'Yuborilmoqda...' : "🎟️ Ro'yxatdan o'tish"}
            </button>

            <p className="text-xs text-center text-gray-400">
              Ma'lumotlaringiz faqat festival maqsadida ishlatiladi
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
