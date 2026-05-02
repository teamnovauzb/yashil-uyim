import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket, CalendarDays, Newspaper, Lightbulb, Camera, Leaf, MapPin, ExternalLink, PlayCircle } from 'lucide-react'
import CountdownTimer from '../components/CountdownTimer'
import XButton from '../components/XButton'
import ImageLightbox from '../components/ImageLightbox'
import { isTelegram, openExternal } from '../lib/telegram'
import { getSetting } from '../lib/settings'
import { useT } from '../lib/prefs'
import { supabase } from '../lib/supabase'

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
    img: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&q=80',
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

const featureDefs = [
  { Icon: Ticket,     titleKey: 'featTicket',     descKey: 'featTicketDesc',     to: '/chipta',      btnKey: 'featRegister' },
  { Icon: CalendarDays, titleKey: 'featProgram', descKey: 'featProgramDesc',    to: '/dastur',      btnKey: 'viewProgram' },
  { Icon: Newspaper,  titleKey: 'featNews',       descKey: 'featNewsDesc',       to: '/yangiliklar', btnKey: 'featNews' },
  { Icon: Lightbulb,  titleKey: 'featSuggestion', descKey: 'featSuggestionDesc', to: '/taklif',      btnKey: 'sendSuggestion' },
]

function useCountdownTo(targetDate) {
  const [timeLeft, setTimeLeft] = useState({})

  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return timeLeft
}

export default function Home() {
  const [showPopup, setShowPopup] = useState(false)
  const [venue, setVenue] = useState({ address: '', lat: '', lng: '' })
  const [festivalDate, setFestivalDate] = useState('2026-04-25T09:00:00')
  const [galleryItems, setGalleryItems] = useState(null) // null = loading, [] = empty
  const [lightbox, setLightbox] = useState(null)
  const navigate = useNavigate()
  const inTelegram = isTelegram()
  const countdown = useCountdownTo(festivalDate)
  const t = useT()

  useEffect(() => {
    Promise.all([
      getSetting('festival_address', 'Toshkent'),
      getSetting('festival_lat', ''),
      getSetting('festival_lng', ''),
      getSetting('festival_date', '2026-04-25T09:00:00'),
    ]).then(([address, lat, lng, date]) => {
      setVenue({ address, lat, lng })
      if (date) setFestivalDate(date)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('gallery')
      .select('id, media_type, media_url, thumbnail_url, caption')
      .order('sort_order', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setGalleryItems([])
        else setGalleryItems(data || [])
      })
    return () => { cancelled = true }
  }, [])

  // Show DB items when present; otherwise fall back to the hardcoded photos
  // so the section is never empty even on a fresh deploy.
  const displayGallery = (galleryItems && galleryItems.length > 0)
    ? galleryItems.map(g => ({
        id:       g.id,
        type:     g.media_type,
        src:      g.media_url,
        poster:   g.thumbnail_url || (g.media_type === 'image' ? g.media_url : null),
        caption:  g.caption || '',
      }))
    : instagramPosts.map((p, i) => ({
        id:       `fallback-${i}`,
        type:     'image',
        src:      p.img,
        poster:   p.img,
        caption:  p.caption,
      }))

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
            <h2 className="text-lg font-bold text-[#1B2D1F] mb-1">
              Bizda yangi festival bor!
            </h2>
            <p className="text-[#40916C] text-sm mb-4">
              {new Date(festivalDate).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })} — festivalgacha qoldi:
            </p>

            {/* Live countdown */}
            <div className="flex justify-center gap-2 mb-5">
              {[
                { label: 'kun', value: countdown.days },
                { label: 'soat', value: countdown.hours },
                { label: 'daq', value: countdown.minutes },
                { label: 'son', value: countdown.seconds },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center bg-[#D8F3DC] rounded-xl px-3 py-2 min-w-[52px]">
                  <span className="text-2xl font-bold text-[#2D6A4F] tabular-nums leading-none">
                    {String(value ?? 0).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-[#40916C] mt-0.5">{label}</span>
                </div>
              ))}
            </div>
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] text-white py-20 px-4">
        {/* Eco-tree backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none bg-no-repeat bg-center bg-contain opacity-25"
          style={{
            backgroundImage: 'url(/landing.png)',
            mixBlendMode: 'screen',
          }}
        />
        {/* Soft vignette so text reads cleanly over the tree */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(27, 67, 50, 0.55) 75%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm font-medium mb-6 text-green-200">
            <Leaf size={14} /> {t('monthlyTashkent')}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            {t('appName')}
          </h1>
          <p className="text-xl md:text-2xl text-green-200 mb-2 font-light">
            {t('tagline')}
          </p>
          <p className="text-green-300 mb-10 max-w-xl mx-auto leading-relaxed">
            Tabiat bilan uyg'unlikda yashaymiz. Ekologiya, barqaror turmush tarzi
            va yashil texnologiyalar festivali.
          </p>

          <div className="mb-10">
            <p className="text-green-300 text-sm mb-4 uppercase tracking-widest font-medium">
              {t('festivalIn')}
            </p>
            <CountdownTimer />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/chipta"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#2D6A4F] font-semibold px-8 py-3 rounded-full hover:bg-green-100 transition-colors shadow-lg"
            >
              <Ticket size={18} /> {t('buyTicket')}
            </Link>
            <Link
              to="/dastur"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors"
            >
              <CalendarDays size={18} /> {t('viewProgram')}
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery (admin-managed, falls back to hardcoded photos when empty) */}
      <section className="py-16 px-4 bg-[#F0FFF4]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <Camera size={22} className="text-[#2D6A4F]" />
              <span className="text-sm font-semibold text-[#2D6A4F] tracking-widest uppercase">@yashil_uyim</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1B2D1F] mb-2">
              {t('instagramOurs')}
            </h2>
            <p className="text-[#40916C]">{t('festivalMoments')}</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 md:gap-2 mb-8">
            {displayGallery.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightbox(item)}
                className="relative aspect-square overflow-hidden rounded-lg group bg-gray-200"
              >
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt={item.caption}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={item.src}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <PlayCircle size={36} className="text-white drop-shadow-lg" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  {item.caption && (
                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center px-2">
                      {item.caption}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <a
              href="https://www.instagram.com/yashil_uyim"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg"
            >
              <Camera size={18} />
              {t('followUs')}
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1B2D1F] mb-2">
            {t('whatAtFestival')}
          </h2>
          <p className="text-center text-[#40916C] mb-10">
            {t('forAllAges')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureDefs.map(f => (
              <div
                key={f.to}
                className="bg-white rounded-2xl p-6 shadow-sm border border-[#B7E4C7] hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-[#D8F3DC] flex items-center justify-center mb-3 text-[#2D6A4F]">
                  <f.Icon size={24} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-[#1B2D1F] mb-2">{t(f.titleKey)}</h3>
                <p className="text-sm text-gray-500 mb-4 flex-1 leading-relaxed">{t(f.descKey)}</p>
                <Link
                  to={f.to}
                  className="block text-center bg-[#2D6A4F] text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-[#40916C] transition-colors"
                >
                  {t(f.btnKey)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      {venue.address && (
        <section className="py-12 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-[#D8F3DC] text-[#2D6A4F] rounded-full px-4 py-1.5 text-xs font-semibold mb-3">
                <MapPin size={14} /> {t('eventLocation')}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1B2D1F] mb-2">
                {t('whereIsIt')}
              </h2>
              <p className="text-[#40916C] text-sm">{venue.address}</p>
            </div>

            {venue.lat && venue.lng && (
              <div className="rounded-2xl overflow-hidden border border-[#B7E4C7] shadow-sm mb-4">
                <iframe
                  title="Festival location"
                  className="w-full h-64"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${+venue.lng - 0.01},${+venue.lat - 0.005},${+venue.lng + 0.01},${+venue.lat + 0.005}&layer=mapnik&marker=${venue.lat},${venue.lng}`}
                />
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => openExternal(
                  venue.lat && venue.lng
                    ? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`
                )}
                className="inline-flex items-center gap-2 bg-[#2D6A4F] text-white px-6 py-3 rounded-full font-medium hover:bg-[#40916C] transition-colors shadow-sm"
              >
                <ExternalLink size={16} /> {t('openInMaps')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* About */}
      <section className="bg-[#D8F3DC] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#2D6A4F] text-white flex items-center justify-center mx-auto mb-4">
            <Leaf size={26} />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1B2D1F] mb-4">
            {t('aboutUs')}
          </h2>
          <p className="text-[#2D6A4F] leading-relaxed mb-6">
            Yashil Uyim — ekologiya, barqaror rivojlanish va tabiatga mehr mavzularida
            o'tkaziladigan oylik festival. Biz hammani tabiat bilan uyg'un, ekologik jihatdan
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

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.caption || ''}
          mediaType={lightbox.type}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
