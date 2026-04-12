import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SplashScreen from './components/SplashScreen'
import Onboarding from './components/Onboarding'
import Home from './pages/Home'
import Tickets from './pages/Tickets'
import Program from './pages/Program'
import News from './pages/News'
import Suggestions from './pages/Suggestions'
import ContactShare from './pages/ContactShare'
import { isTelegram } from './lib/telegram'

const inTelegram = isTelegram()

function TelegramHome() {
  const contacted = sessionStorage.getItem('tg_contacted')
  // First time: show contact share screen
  if (!contacted) {
    return <Navigate to="/contact" replace />
  }
  // After sharing: show homepage
  return <Home />
}

export default function App() {
  const alreadySeen = sessionStorage.getItem('splash_shown')

  const [showSplash, setShowSplash] = useState(!alreadySeen)
  const [showOnboarding, setShowOnboarding] = useState(false)

  function handleSplashDone() {
    sessionStorage.setItem('splash_shown', 'true')
    setShowSplash(false)
  }

  function handleOnboardingDone() {
    setShowOnboarding(false)
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#F0FFF4',
            border: '1px solid #B7E4C7',
            color: '#1B2D1F',
          },
          success: {
            iconTheme: { primary: '#2D6A4F', secondary: '#fff' },
          },
        }}
      />
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      {showOnboarding && <Onboarding onDone={handleOnboardingDone} />}
      {!inTelegram && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={inTelegram ? <TelegramHome /> : <Home />} />
          <Route path="/contact" element={inTelegram ? <ContactShare onDone={() => setShowOnboarding(true)} /> : <Navigate to="/" replace />} />
          <Route path="/chipta" element={<Tickets />} />
          <Route path="/dastur" element={<Program />} />
          <Route path="/yangiliklar" element={<News />} />
          <Route path="/taklif" element={<Suggestions />} />
        </Routes>
      </main>
      {!inTelegram && <Footer />}
    </BrowserRouter>
  )
}
