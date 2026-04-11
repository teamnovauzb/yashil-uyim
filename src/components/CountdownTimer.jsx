import { useState, useEffect } from 'react'

const FESTIVAL_DATE = new Date('2025-06-15T09:00:00')

function getTimeLeft() {
  const now = new Date()
  const diff = FESTIVAL_DATE - now

  if (diff <= 0) return null

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function Pad({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 min-w-[70px] text-center">
        <span className="text-3xl md:text-4xl font-bold text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-green-200 text-xs mt-1 font-medium">{label}</span>
    </div>
  )
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft())

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!timeLeft) {
    return (
      <p className="text-white text-xl font-semibold">
        🎉 Festival boshlandi!
      </p>
    )
  }

  return (
    <div className="flex gap-3 md:gap-4 justify-center flex-wrap">
      <Pad value={timeLeft.days} label="kun" />
      <Pad value={timeLeft.hours} label="soat" />
      <Pad value={timeLeft.minutes} label="daqiqa" />
      <Pad value={timeLeft.seconds} label="soniya" />
    </div>
  )
}
