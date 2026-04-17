import { useState } from 'react'

const slides = [
  {
    emoji: '🌿',
    title: 'Yashil Uyimga xush kelibsiz!',
    desc: 'Ekologiya, barqaror turmush tarzi va yashil texnologiyalar festivali. Har oy Toshkentda.',
    bg: 'from-[#1B4332] via-[#2D6A4F] to-[#40916C]',
  },
  {
    emoji: '🌍',
    title: 'Chipta oling — tabiatga yordam',
    desc: 'Har bir chipta — bu festivalni qo\'llab-quvvatlash va tabiatga g\'amxo\'rlik. Joylar cheklangan!',
    bg: 'from-[#2D6A4F] via-[#40916C] to-[#52B788]',
  },
  {
    emoji: '🎤',
    title: 'Ma\'ruzalar & Master-klasslar',
    desc: 'Ekologlar, arxitektorlar va fermerlar bilan jonli suhbatlar, amaliy master-klasslar va musiqa.',
    bg: 'from-[#40916C] via-[#52B788] to-[#74C69D]',
  },
]

export default function Onboarding({ onDone }) {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)

  function goNext() {
    if (animating) return
    if (current < slides.length - 1) {
      setAnimating(true)
      setTimeout(() => {
        setCurrent((c) => c + 1)
        setAnimating(false)
      }, 200)
    } else {
      onDone()
    }
  }

  function skip() {
    onDone()
  }

  const slide = slides[current]

  return (
    <div
      className={`fixed inset-0 z-[150] flex flex-col items-center justify-between bg-gradient-to-br ${slide.bg} transition-all duration-500 text-white px-6 pb-12 pt-16`}
    >
      {/* Skip button */}
      <div className="w-full flex justify-end">
        {current < slides.length - 1 && (
          <button
            onClick={skip}
            className="text-white/60 text-sm font-medium hover:text-white transition-colors"
          >
            O'tkazib yuborish
          </button>
        )}
      </div>

      {/* Slide content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center text-center transition-opacity duration-200 ${
          animating ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="text-8xl mb-8">{slide.emoji}</div>
        <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">
          {slide.title}
        </h1>
        <p className="text-white/80 text-base leading-relaxed max-w-xs">
          {slide.desc}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="w-full flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2.5 bg-white'
                  : 'w-2.5 h-2.5 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Next / Start button */}
        <button
          onClick={goNext}
          className="w-full max-w-xs bg-white text-[#2D6A4F] font-bold py-4 rounded-2xl text-base hover:bg-green-50 transition-colors shadow-lg"
        >
          {current < slides.length - 1 ? 'Keyingisi →' : '🌿 Boshlash'}
        </button>
      </div>
    </div>
  )
}
