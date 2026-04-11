import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import XButton from '../components/XButton'

export default function Suggestions() {
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
      const { error } = await supabase.from('suggestions').insert([
        {
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          message: data.message,
        },
      ])

      if (error) throw error

      setSubmitted(true)
      reset()
      toast.success('Taklifingiz yuborildi!')
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
        <XButton />
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-5xl mb-4 block">💡</span>
          <h1 className="text-3xl font-bold text-[#1B2D1F] mb-2">Taklif yuborish</h1>
          <p className="text-[#40916C]">
            Festivalga oid fikr, g'oya yoki takliflaringizni biz bilan baham ko'ring
          </p>
        </div>

        {submitted ? (
          <div className="bg-green-50 border border-[#52B788] rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🙏</div>
            <h2 className="text-xl font-bold text-[#2D6A4F] mb-2">
              Rahmat!
            </h2>
            <p className="text-[#40916C] mb-6">
              Taklifingiz muvaffaqiyatli yuborildi. Tez orada ko'rib chiqamiz.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="bg-[#2D6A4F] text-white px-6 py-2 rounded-lg hover:bg-[#40916C] transition-colors font-medium"
            >
              Yana taklif yuborish
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
                Ism <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ismingiz"
                {...register('full_name', {
                  required: 'Ism kiritish majburiy',
                  minLength: { value: 2, message: 'Ism kamida 2 ta harf bo\'lishi kerak' },
                })}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#52B788] transition-all ${
                  errors.full_name ? 'border-red-400' : 'border-[#B7E4C7] focus:border-[#52B788]'
                }`}
              />
              {errors.full_name && (
                <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>
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

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Telefon <span className="text-gray-400 font-normal">(ixtiyoriy)</span>
              </label>
              <input
                type="tel"
                placeholder="+998 90 123 45 67"
                {...register('phone')}
                className="w-full border border-[#B7E4C7] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#52B788] focus:border-[#52B788] transition-all"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-[#1B2D1F] mb-1.5">
                Taklif yoki g'oya <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Taklifingizni bu yerda yozing..."
                {...register('message', {
                  required: 'Taklif matni kiritish majburiy',
                  minLength: { value: 10, message: 'Taklif kamida 10 ta belgi bo\'lishi kerak' },
                })}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#52B788] transition-all resize-none ${
                  errors.message ? 'border-red-400' : 'border-[#B7E4C7] focus:border-[#52B788]'
                }`}
              />
              {errors.message && (
                <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D6A4F] text-white font-semibold py-3 rounded-lg hover:bg-[#40916C] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Yuborilmoqda...' : '💡 Taklif yuborish'}
            </button>

            <p className="text-xs text-center text-gray-400">
              Barcha takliflar ko'rib chiqiladi
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
