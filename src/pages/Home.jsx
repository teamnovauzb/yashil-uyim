import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CountdownTimer from '../components/CountdownTimer'
import XButton from '../components/XButton'
import { isTelegram } from '../lib/telegram'

const instagramPosts = [
  {
    img: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&q=80',
    caption: 'Yashil tabiat 🌿',
  },
  {
    img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
    caption: 'Bog\'cha hayoti 🌱',
  },
  {
    img: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&q=80',
    caption: 'Ekologik festival 🎉',
  },
  {
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    caption: 'Tabiat go\'zalligi 🌸',
  },
  {
    img: 'https://images.unsplash.com/photo-1503785640985-f62e3aeee448?w=400&q=80',
    caption: 'Yashil dunyo 🌍',
  },
  {
    img: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&q=80',
    caption: 'Barqaror hayot ♻️',
  },
]

const features = [
  {
    icon: '🎟️',
    title: 'Chipta olish',
    desc: 'Festival uchun bepul ro\'yxatdan o\'ting. Joylar cheklangan!',
    to: '/chipta',
    btn: 'Ro\'yxatdan o\'tish',
  },
  {
    icon: '📋',
    title: 'Festival dasturi',
    desc: 'Ma\'ruzalar, master-klasslar, konsertlar va ko\'rgazmalar jadvali.',
    to: '/dastur',
    btn: 'Dasturni ko\'rish',
  },
  {
    icon: '📰',
    title: 'Yangiliklar',
    desc: 'Festival haqidagi so\'nggi yangiliklar va e\'lonlar.',
    to: '/yangiliklar',
    btn: 'Yangiliklar',
  },
  {
    icon: '💡',
    title: 'Taklif yuborish',
    desc: 'Festival tashkilotchilariga g\'oya va takliflaringizni yuboring.',
    to: '/taklif',
    btn: 'Taklif yuborish',
  },
]

export default function Home() {
  const [showPopup, setShowPopup] = useState(false)
  const navigate = useNavigate()
  const inTelegram = isTelegram()

  useEffect(() => {
    if (!inTelegram) return
    if (sessionStorage.getItem('tg_popup_shown')) return
    const timer = setTimeout(() => {
      setShowPopup(true)
      sessionStorage.setItem('tg_popup_shown', 'true')
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      {/* 2-second popup — only in Telegram */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPopup(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-lg font-bold text-[#1B2D1F] mb-2">
              Bizda yangi festival bor!
            </h2>
            <p className="text-[#40916C] text-sm mb-5">
              Chipta sotib oling va festivalni o'tkazib yubormang!
            </p>
            <button
              onClick={() => {
                setShowPopup(false)
                navigate('/chipta')
              }}
              className="w-full bg-[#2D6A4F] text-white font-bold py-3.5 rounded-2xl hover:bg-[#40916C] transition-colors text-sm mb-3"
            >
              🎟️ Chipta sotib olish
            </button>
            <button
              onClick={() => setShowPopup(false)}
              className="text-gray-400 text-xs"
            >
              Keyinroq
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm font-medium mb-6 text-green-200">
            🌿 Har oy · Toshkent
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Yashil Uyim
          </h1>
          <p className="text-xl md:text-2xl text-green-200 mb-2 font-light">
            Ekologik Festival
          </p>
          <p className="text-green-300 mb-10 max-w-xl mx-auto leading-relaxed">
            Tabiat bilan uyg'unlikda yashaymiz. Ekologiya, barqaror turmush tarzi
            va yashil texnologiyalar festivali.
          </p>

          <div className="mb-10">
            <p className="text-green-300 text-sm mb-4 uppercase tracking-widest font-medium">
              Festivalgacha qoldi
            </p>
            <CountdownTimer />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/chipta"
              className="bg-white text-[#2D6A4F] font-semibold px-8 py-3 rounded-full hover:bg-green-100 transition-colors shadow-lg"
            >
              🎟️ Chipta olish
            </Link>
            <Link
              to="/dastur"
              className="border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors"
            >
              📋 Dasturni ko'rish
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1B2D1F] mb-2">
            Festivalda nima bo'ladi?
          </h2>
          <p className="text-center text-[#40916C] mb-10">
            Barcha yosh va qiziqishlar uchun dastur tayyorlandi
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => (
              <div
                key={f.to}
                className="bg-white rounded-2xl p-6 shadow-sm border border-[#B7E4C7] hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col"
              >
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="text-lg font-bold text-[#1B2D1F] mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 mb-4 flex-1 leading-relaxed">{f.desc}</p>
                <Link
                  to={f.to}
                  className="block text-center bg-[#2D6A4F] text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-[#40916C] transition-colors"
                >
                  {f.btn}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram Gallery */}
      <section className="py-16 px-4 bg-[#F0FFF4]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <svg className="w-6 h-6 text-[#2D6A4F]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              <span className="text-sm font-semibold text-[#2D6A4F] tracking-widest uppercase">@yashil_uyim</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1B2D1F] mb-2">
              Bizning Instagram
            </h2>
            <p className="text-[#40916C]">Festival lahzalari va yangiliklar</p>
          </div>

          {/* Photo grid */}
          <div className="grid grid-cols-3 gap-1.5 md:gap-2 mb-8">
            {instagramPosts.map((post, i) => (
              <a
                key={i}
                href="https://www.instagram.com/yashil_uyim"
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square overflow-hidden rounded-lg group"
              >
                <img
                  src={post.img}
                  alt={post.caption}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center px-2">
                    {post.caption}
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div className="text-center">
            <a
              href="https://www.instagram.com/yashil_uyim"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              Kuzatib boring
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-[#D8F3DC] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-4xl mb-4 block">🌱</span>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1B2D1F] mb-4">
            Yashil Uyim haqida
          </h2>
          <p className="text-[#2D6A4F] leading-relaxed mb-6">
            Yashil Uyim — ekologiya, barqaror rivojlanish va tabiatga mehr mavzularida
            o'tkaziladigan yillik festival. Biz hammani tabiat bilan uyg'un, ekologik jihatdan
            mas'uliyatli turmush tarziga undaymiz.
          </p>
          <p className="text-[#2D6A4F] leading-relaxed mb-8">
            Festival davomida taniqli ekologlar, arxitektorlar, fermerlar va faollar
            bilan suhbatlar, amaliy master-klasslar hamda jonli musiqa va ko'rgazmalar bo'ladi.
          </p>
          <a
            href="https://www.instagram.com/yashil_uyim"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2D6A4F] text-white px-6 py-3 rounded-full font-medium hover:bg-[#40916C] transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            Instagram sahifamiz
          </a>
        </div>
      </section>
    </div>
  )
}
