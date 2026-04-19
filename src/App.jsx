import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import TelegramBackButton from './components/TelegramBackButton'
import SplashScreen from './components/SplashScreen'
import Onboarding from './components/Onboarding'
import Home from './pages/Home'
import Tickets from './pages/Tickets'
import Program from './pages/Program'
import News from './pages/News'
import Suggestions from './pages/Suggestions'
import ContactShare from './pages/ContactShare'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import { isTelegram, getTelegramUser } from './lib/telegram'
import { isContacted, markContacted, loadContactFromDb, isTester } from './lib/contact'
import { isAdmin } from './lib/admins'

const inTelegram = isTelegram()
const tgUserAtBoot = getTelegramUser()

function TelegramHome() {
  const tgUser = getTelegramUser()
  const [checking, setChecking] = useState(true)
  const [adminRedirect, setAdminRedirect] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (await isAdmin(tgUser?.id)) {
        if (!cancelled) { setAdminRedirect(true); setChecking(false) }
        return
      }
      if (!isContacted(tgUser)) {
        const phone = await loadContactFromDb(tgUser)
        if (phone && !cancelled) markContacted(tgUser, phone)
      }
      if (!cancelled) setChecking(false)
    }
    init()
    return () => { cancelled = true }
  }, [tgUser?.id])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0FFF4]">
        <div className="text-4xl animate-pulse">🌿</div>
      </div>
    )
  }

  if (adminRedirect) return <Navigate to="/admin" replace />
  if (!isContacted(tgUser)) return <Navigate to="/contact" replace />
  return <Home />
}

export default function App() {
  const isAdminRoute = window.location.pathname === '/admin'
  const alreadySeen = sessionStorage.getItem('splash_shown')

  const [showSplash, setShowSplash] = useState(!alreadySeen && !isAdminRoute)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Tester mode: always re-show intros + onboarding on every fresh load
  useEffect(() => {
    if (!inTelegram || isAdminRoute) return
    isTester(tgUserAtBoot).then((tester) => {
      if (!tester) return
      sessionStorage.removeItem('splash_shown')
      sessionStorage.removeItem('tg_popup_shown')
      setShowSplash(true)
      // Force onboarding to show, regardless of contact state
      // (contact may be re-hydrated from DB, so we can't rely on /contact re-triggering it)
      setShowOnboarding(true)
      // Reset contact cache so the contact screen shows again
      const k = tgUserAtBoot?.id ? `tg_contact_${tgUserAtBoot.id}` : null
      if (k) localStorage.removeItem(k)
    })
  }, [isAdminRoute])

  function handleSplashDone() {
    sessionStorage.setItem('splash_shown', 'true')
    setShowSplash(false)
  }

  function handleOnboardingDone() {
    setShowOnboarding(false)
  }

  return (
    <BrowserRouter>
      {inTelegram && <TelegramBackButton />}
      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1B2D1F',
            color: '#F0FFF4',
            borderRadius: '14px',
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            maxWidth: '90vw',
          },
          success: {
            iconTheme: { primary: '#52B788', secondary: '#1B2D1F' },
          },
          error: {
            style: {
              background: '#7f1d1d',
              color: '#fff',
              borderRadius: '14px',
              padding: '12px 18px',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            },
            iconTheme: { primary: '#fff', secondary: '#7f1d1d' },
          },
        }}
      />
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      {showOnboarding && <Onboarding onDone={handleOnboardingDone} />}
      {!inTelegram && <Navbar />}
      <main className="flex-1 pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={inTelegram ? <TelegramHome /> : <Home />} />
          <Route path="/contact" element={inTelegram ? <ContactShare onDone={() => setShowOnboarding(true)} /> : <Navigate to="/" replace />} />
          <Route path="/chipta" element={<Tickets />} />
          <Route path="/dastur" element={<Program />} />
          <Route path="/yangiliklar" element={<News />} />
          <Route path="/taklif" element={<Suggestions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      {!inTelegram && <Footer />}
      {!isAdminRoute && <BottomNav />}
    </BrowserRouter>
  )
}
