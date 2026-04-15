import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { showBackButton } from '../lib/telegram'

export default function TelegramBackButton() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Always show so Android hardware back is intercepted (doesn't close the app).
    const cleanup = showBackButton(() => {
      if (location.pathname === '/') return // stay on home
      if (window.history.length > 1) navigate(-1)
      else navigate('/')
    })
    return cleanup
  }, [location.pathname, navigate])

  useEffect(() => {
    // Prevent accidental close via vertical swipe (Telegram v7+)
    try { window.Telegram?.WebApp?.disableVerticalSwipes?.() } catch {}
  }, [])

  return null
}
