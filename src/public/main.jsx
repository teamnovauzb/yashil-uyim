import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PublicApp from './App.jsx'
import './public.css'

// Guest entry: public REST reads only; no Telegram/auth SDK, session, admin, or ticket modules.
createRoot(document.getElementById('root')).render(<StrictMode><PublicApp /></StrictMode>)
