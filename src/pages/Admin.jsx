import { useState, useEffect } from 'react'
import {
  Leaf, RefreshCw, LogOut, Shield, LayoutDashboard, Ticket as TicketIcon,
  CalendarCheck, User as UserIcon, QrCode,
} from 'lucide-react'
import { getTelegramUser, closeMiniApp, isTelegram } from '../lib/telegram'
import { loadAdmins, isAdmin, isSuperAdmin } from '../lib/admins'
import { useT } from '../lib/prefs'
import TicketsView from './admin/TicketsView'
import OverviewView from './admin/OverviewView'
import EventsView from './admin/EventsView'
import AdminProfileView from './admin/AdminProfileView'
import ScannerView from './admin/ScannerView'

const SAFE_TOP = 'max(env(safe-area-inset-top), 4rem)'

const VIEWS = [
  { key: 'overview', labelKey: 'overview', Icon: LayoutDashboard, Component: OverviewView },
  { key: 'tickets',  labelKey: 'tickets',  Icon: TicketIcon,      Component: TicketsView },
  { key: 'scanner',  label:    'Skaner',   Icon: QrCode,          Component: ScannerView },
  { key: 'events',   labelKey: 'program',  Icon: CalendarCheck,   Component: EventsView },
  { key: 'profile',  labelKey: 'profile',  Icon: UserIcon,        Component: AdminProfileView },
]

export default function Admin() {
  const t = useT()
  const tgUser = getTelegramUser()
  const [authed, setAuthed] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [isSuper, setIsSuper] = useState(false)
  const [view, setViewKey] = useState('overview')
  const [viewPayload, setViewPayload] = useState(null)
  const setView = (key, payload = null) => {
    setViewKey(key)
    setViewPayload(payload)
  }

  useEffect(() => {
    let cancelled = false
    async function check() {
      await loadAdmins()
      const tgAdmin = await isAdmin(tgUser?.id)
      if (cancelled) return
      setAuthed(!!tgAdmin)
      setIsSuper(isSuperAdmin(tgUser?.id))
      setAuthLoading(false)
    }
    check()
    return () => { cancelled = true }
  }, [tgUser?.id])

  const handleLogout = () => {
    if (isTelegram()) closeMiniApp()
    else window.location.href = '/'
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <RefreshCw size={24} className="text-green-500 animate-spin" />
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-[#0d1b14] to-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900/70 backdrop-blur rounded-3xl p-8 w-full max-w-sm border border-gray-800 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-rose-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Ruxsat yo'q</h1>
          <p className="text-gray-500 text-sm mt-2 mb-6">
            Sizning Telegram akkauntingiz admin emas.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl"
          >
            Yopish
          </button>
        </div>
      </div>
    )
  }

  const visibleViews = VIEWS.filter((v) => !v.superOnly || isSuper)
  const Active = visibleViews.find((v) => v.key === view)?.Component || OverviewView

  return (
    <div id="admin-root" className="min-h-screen bg-gradient-to-b from-gray-950 to-[#0a120d] text-white">
      {/* Safe-area top spacer — generous for Telegram mini app top chrome */}
      <div style={{ height: SAFE_TOP }} className="bg-gray-900/90 backdrop-blur" />

      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Leaf size={18} className="text-green-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{t('adminPanel')}</p>
            <p className="text-[11px] text-gray-500">
              {isSuper ? 'Super admin' : 'Admin'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
          aria-label="Chiqish"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* View content */}
      <div className="pb-24">
        <Active isSuper={isSuper} tgUser={tgUser} setView={setView} initial={viewPayload} />
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur border-t border-gray-800">
        <ul className="flex justify-around items-stretch">
          {visibleViews.map(({ key, labelKey, label, Icon }) => {
            const active = view === key
            return (
              <li key={key} className="flex-1">
                <button
                  onClick={() => setView(key, null)}
                  className={`w-full flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                    active ? 'text-green-400' : 'text-gray-500'
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                  <span>{label || t(labelKey)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="h-[env(safe-area-inset-bottom)] bg-gray-900" />
      </nav>
    </div>
  )
}
