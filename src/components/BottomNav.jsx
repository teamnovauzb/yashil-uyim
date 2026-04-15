import { NavLink, useLocation } from 'react-router-dom'
import { Home, Newspaper, Ticket, CalendarDays, User } from 'lucide-react'
import { useT } from '../lib/prefs'

const HIDE_ON = ['/contact', '/admin']

export default function BottomNav() {
  const location = useLocation()
  const t = useT()
  if (HIDE_ON.includes(location.pathname)) return null

  const items = [
    { to: '/', label: t('home'), icon: Home, end: true },
    { to: '/yangiliklar', label: t('news'), icon: Newspaper },
    { to: '/chipta', label: t('tickets'), icon: Ticket },
    { to: '/dastur', label: t('program'), icon: CalendarDays },
    { to: '/profile', label: t('profile'), icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#B7E4C7] md:hidden">
      <ul className="flex justify-around items-stretch">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-[#2D6A4F]' : 'text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)] bg-white" />
    </nav>
  )
}
