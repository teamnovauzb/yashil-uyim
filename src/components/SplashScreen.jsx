import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setFadeOut(true)
    }, 2000)

    const doneTimer = setTimeout(() => {
      onDone()
    }, 2500)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="text-center text-white px-6">
        <div className="text-7xl mb-6">🌿</div>
        <h1 className="text-4xl font-bold mb-2 tracking-tight">Yashil Uyim</h1>
        <p className="text-green-200 text-lg font-light mb-10">Ekologik Festival</p>

        {/* Loading dots */}
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 bg-white/70 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
            />
          ))}
        </div>
      </div>

      {/* Bottom tag */}
      <div className="absolute bottom-10 text-green-300 text-xs tracking-widest uppercase">
        Har oy · Toshkent
      </div>
    </div>
  )
}
