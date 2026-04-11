import { useNavigate } from 'react-router-dom'
import { isTelegram } from '../lib/telegram'

export default function XButton() {
  const navigate = useNavigate()

  if (!isTelegram()) return null

  return (
    <div className="flex justify-end mb-4">
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem('tg_visited', 'true')
          navigate('/')
        }}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1B2D1F] text-white hover:bg-[#40916C] transition-colors text-lg font-bold"
      >
        ✕
      </button>
    </div>
  )
}
