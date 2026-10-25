import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initTelegram } from './lib/telegram.js'
import { PrefsProvider } from './lib/prefs.jsx'
import { usesVps } from './lib/runtime'
import VpsGate from './components/VpsGate.jsx'
import { initMobile } from './mobile.js'

initTelegram()
if (usesVps) initMobile().catch(() => console.error('Native navigation unavailable'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrefsProvider>
      {usesVps ? <VpsGate><App /></VpsGate> : <App />}
    </PrefsProvider>
  </StrictMode>,
)
