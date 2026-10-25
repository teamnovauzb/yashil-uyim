import { useEffect, useRef, useState } from 'react'
import { Leaf, Send, ArrowLeft, RefreshCw } from 'lucide-react'
import { getSessionUser, restoreSession, startLogin, verifyLogin } from '../lib/session'
import { isNative } from '../lib/runtime'

async function openTelegram(url) {
  if(isNative) {const {Browser}=await import('@capacitor/browser');await Browser.open({url})}
  else window.open(url,'_blank','noopener,noreferrer')
}
export default function VpsGate({children}) {
  const [user,setUser]=useState(getSessionUser),[loading,setLoading]=useState(true)
  const [login,setLogin]=useState(null),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [remaining,setRemaining]=useState(0),[expires,setExpires]=useState(0)
  const boot=useRef(null),input=useRef(null)
  useEffect(()=>{
    let active=true
    const listener=()=>{
      const current=getSessionUser();setUser(current)
      if(!current){setLogin(null);setCode('');setExpires(0)}
    }
    window.addEventListener('yu-session',listener)
    boot.current ||= restoreSession()
    boot.current.catch(()=>{if(active)setError('Server bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.')}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false;window.removeEventListener('yu-session',listener)}
  },[])
  useEffect(()=>{
    if(!expires)return
    const tick=()=>setRemaining(Math.max(0,Math.ceil((expires-Date.now())/1000)))
    const timer=setInterval(tick,1000);return()=>clearInterval(timer)
  },[expires])
  async function begin() {
    setBusy(true);setError('')
    try {
      const request=await startLogin();setLogin(request);setCode('');setRemaining(request.expires_in);setExpires(Date.now()+request.expires_in*1000)
      await openTelegram(request.telegram_url)
      input.current?.focus()
    }catch(err){setError(err.message||'Kodni olish amalga oshmadi.')}
    finally{setBusy(false)}
  }
  async function submit(event) {
    event.preventDefault();setBusy(true);setError('')
    try{await verifyLogin(login.challenge,login.verifier,code)}catch(err){setError(err.message)}finally{setBusy(false)}
  }
  if(user&&!loading)return children
  return <main className="vps-login">
    <div className="vps-login-content">
      <Leaf size={36} aria-hidden="true" className="text-[#2D6A4F]" />
      <p className="text-sm font-semibold text-[#2D6A4F] mt-5">YASHIL UYIM</p>
      <h1 className="text-3xl font-bold text-[#1B2D1F] mt-3">{loading?'Hisob tekshirilmoqda…':login?'Telegramdagi kodni kiriting':'Festivalga xush kelibsiz'}</h1>
      <p className="text-base leading-relaxed text-[#365A42] mt-4">{login?'Bot yuborgan 6 xonali kod orqali hisobingizga kiring.':'Chiptalaringiz va profilingiz Telegram hisobingiz bilan bog‘lanadi.'}</p>
      {loading?<p role="status" className="mt-8 flex items-center gap-2"><RefreshCw size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/>Yuklanmoqda…</p>:login?<form onSubmit={submit} className="mt-8 space-y-4">
        <label htmlFor="login-code" className="block font-semibold text-[#1B2D1F]">Kirish kodi</label>
        <input ref={input} id="login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} aria-describedby="code-help login-error" className="vps-code" required />
        <p id="code-help" className="text-sm text-[#365A42]">{remaining?`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} vaqt qoldi`:'Kod muddati tugadi. Yangi kod oling.'}</p>
        <button type="submit" className="vps-primary" disabled={busy||code.length!==6||!remaining}>{busy?'Tekshirilmoqda…':'Hisobga kirish'}</button>
        <button type="button" className="vps-secondary" onClick={()=>openTelegram(login.telegram_url).catch(()=>setError('Telegramni ochib bo‘lmadi.'))}>Telegram botni ochish</button>
        <button type="button" className="vps-secondary" onClick={begin} disabled={busy||remaining>240}>{remaining>240?'Yangi kodni bir daqiqadan keyin olish mumkin':'Yangi kod olish'}</button>
        <button type="button" className="vps-secondary flex items-center justify-center gap-2" onClick={()=>{setLogin(null);setCode('');setError('')}}><ArrowLeft size={18} aria-hidden="true"/>Orqaga</button>
      </form>:<button type="button" className="vps-primary mt-8 flex items-center justify-center gap-2" onClick={begin} disabled={busy}><Send size={20} aria-hidden="true"/>{busy?'Tayyorlanmoqda…':'Telegram orqali kirish'}</button>}
      <p id="login-error" role="alert" className="text-[#9B1C1C] mt-4 min-h-6">{error}</p>
      {!loading&&error&&!login&&<button className="vps-secondary" onClick={()=>window.location.reload()}>Qayta urinish</button>}
    </div>
  </main>
}
