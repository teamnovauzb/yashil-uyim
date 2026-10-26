import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PublicApp from './App.jsx'
import './public.css'

// This entry never imports Telegram, Supabase, session storage, login, admin, or ticket modules.
createRoot(document.getElementById('root')).render(<StrictMode><PublicApp /></StrictMode>)
