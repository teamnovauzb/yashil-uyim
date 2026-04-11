import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function Tickets() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const { error } = await supabase.from('tickets').insert([
        {
          full_name: data.full_name,
          phone: data.phone,
          email: data.email || null,
          ticket_count: Number(data.ticket_count),
        },
      ])

      if (error) throw error

      setSubmitted(true)
      reset()
      toast.success('Ro\'yxatdan muvaffaqiyatli o\'tdingiz!')
    } catch (err) {
      console.error(err)
      toast.error('Xatolik yuz berdi. Qayta urinib ko\'ring.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-5xl mb-4 block">🎟️</span>
          <h1 className="text-3xl font-bold text-[#1B2D1F] mb-2">Chipta olish</h1>
          <p className="text-[#40916C]">
            Festival bepul. Faqat ro'yxatdan o'tish talab etiladi.
            Joylar cheklangan!
          </p>
        </div>

        {submitted ? (
          <div className="bg-green-50 border border-[#52B788] rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-[#2D6A4F] mb-2">
              Tabriklaymiz!
            </h2>
            <p className="text-[#40916C] mb-6">
              Siz muvaffaqiyatli ro'yxatdan o'tdingiz. Festival kunida sizni kutib qolamiz!
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="bg-[#2D6A4F] text-white px-6 py-2 rounded-lg hover:bg-[#40916C] transition-colors font-medium"
            >
              Yana ro'yxatdan o'tish
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white rounded-2xl shadow-sm border border-[#B7E4C7] p-8 space-y-5"
          >
            {/* Full name */}
            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                To'liq ism <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Masalan: Akbar Toshmatov"
                {...register('full_name', {
                  required: 'Ism kiritish majburiy',
                  minLength: { value: 3, message: 'Ism kamida 3 ta harf bo\'lishi kerak' },
                })}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#52B788] transition-all ${
                  errors.full_name ? 'border-red-400' : 'border-[#B7E4C7] focus:border-[#52B788]'
                }`}
              />
              {errors.full_name && (
                <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Telefon raqam <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="+998 90 123 45 67"
                {...register('phone', {
                  required: 'Telefon raqam kiritish majburiy',
                  pattern: {
                    value: /^\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/,
                    message: 'Telefon raqami noto\'g\'ri (+998XXXXXXXXX)',
                  },
                })}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#52B788] transition-all ${
                  errors.phone ? 'border-red-400' : 'border-[#B7E4C7] focus:border-[#52B788]'
                }`}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Email <span className="text-gray-400 font-normal">(ixtiyoriy)</span>
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                {...register('email', {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email manzil noto\'g\'ri',
                  },
                })}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#52B788] transition-all ${
                  errors.email ? 'border-red-400' : 'border-[#B7E4C7] focus:border-[#52B788]'
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Ticket count */}
            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Chipta soni <span className="text-red-500">*</span>
              </label>
              <select
                {...register('ticket_count', { required: 'Chipta sonini tanlang' })}
                className="w-full border border-[#B7E4C7] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#52B788] focus:border-[#52B788] transition-all bg-white"
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} ta chipta</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D6A4F] text-white font-semibold py-3 rounded-lg hover:bg-[#40916C] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Yuborilmoqda...' : '🎟️ Ro\'yxatdan o\'tish'}
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
