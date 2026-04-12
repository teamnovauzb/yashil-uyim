import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestPhone } from '../lib/telegram'

export default function ContactShare({ onDone }) {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [phone, setPhone] = useState('')

  const handleShare = () => {
    requestPhone((sharedPhone) => {
      sessionStorage.setItem('tg_contacted', 'true')
      sessionStorage.setItem('tg_phone', sharedPhone)
      setPhone(sharedPhone)
      setShowModal(true)
    })
  }

  const handleSkip = () => {
    sessionStorage.setItem('tg_contacted', 'true')
    navigate('/')
  }

  const handleContinue = () => {
    setShowModal(false)
    onDone?.()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] flex flex-col items-center justify-center px-6 text-white text-center">
      <div className="text-6xl mb-6">🌿</div>
      <h1 className="text-3xl font-bold mb-3">Yashil Uyim</h1>
      <p className="text-green-200 text-lg mb-2">Ekologik Festival</p>
      <p className="text-green-300 text-sm mb-10 leading-relaxed">
        Davom etish uchun telefon raqamingizni ulashing
      </p>

      <button
        onClick={handleShare}
        className="w-full max-w-xs bg-white text-[#2D6A4F] font-bold py-4 rounded-2xl text-base hover:bg-green-50 transition-colors shadow-lg mb-4 flex items-center justify-center gap-2"
      >
        📱 Kontaktni ulashish
      </button>

      <button
        onClick={handleSkip}
        className="text-green-300 text-sm underline"
      >
        O'tkazib yuborish
      </button>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleContinue}
          />

          {/* Bottom sheet */}
          <div className="relative bg-white rounded-t-3xl w-full max-w-md px-6 pt-6 pb-10 shadow-2xl animate-slide-up">

            {/* Handle bar */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

            {/* Success icon */}
            <div className="w-20 h-20 bg-[#D8F3DC] rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">✅</span>
            </div>

            <h2 className="text-2xl font-bold text-[#1B2D1F] mb-2 text-center">
              Rahmat!
            </h2>
            <p className="text-[#40916C] text-sm text-center mb-2">
              Telefon raqamingiz muvaffaqiyatli saqlandi
            </p>
            {phone && (
              <p className="text-[#2D6A4F] font-bold text-center text-lg mb-6">
                {phone}
              </p>
            )}

            {/* Info row */}
            <div className="bg-[#F0FFF4] border border-[#B7E4C7] rounded-2xl px-4 py-3 mb-6 flex items-center gap-3">
              <span className="text-2xl">🎟️</span>
              <p className="text-sm text-[#2D6A4F] leading-snug">
                Chipta olishda raqamingiz avtomatik to'ldiriladi
              </p>
            </div>

            <button
              onClick={handleContinue}
              className="w-full bg-[#2D6A4F] text-white font-bold py-4 rounded-2xl text-base hover:bg-[#40916C] transition-colors"
            >
              🌿 Davom etish
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
