import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Leaf, Home, CalendarDays, Newspaper, Images, MapPin, Bookmark, Search, RefreshCw, ArrowUpRight, Info, WifiOff, X, ImageOff, Clock, ChevronRight } from 'lucide-react'
import { initialContent, refreshContent, loadSaved, storeSaved, dateLabel, categoryName, mapLink, safeImage, eventDate, privacyUrl, contentSource } from './data'

const tabs=[{to:'/',label:'Bosh',Icon:Home},{to:'/dastur',label:'Dastur',Icon:CalendarDays},{to:'/yangiliklar',label:'Yangiliklar',Icon:Newspaper},{to:'/galereya',label:'Galereya',Icon:Images},{to:'/manzil',label:'Manzil',Icon:MapPin}]
async function openExternal(url) {
  if(!url?.startsWith('https://'))return
  if(Capacitor.isNativePlatform()){const {Browser}=await import('@capacitor/browser');await Browser.open({url})}
  else window.open(url,'_blank','noopener,noreferrer')
}
function Photo({src,alt,onOpen,large=false}) {
  const [failed,setFailed]=useState(null),url=safeImage(src)
  if(!url||failed===url)return <div className="pub-image-placeholder"><ImageOff aria-hidden="true"/><span>Rasm internet orqali yuklanadi</span></div>
  const img=<img src={url} alt={alt} loading="lazy" decoding="async" onError={()=>setFailed(url)} />
  return onOpen?<button className={`pub-photo ${large?'pub-photo-large':''}`} onClick={()=>onOpen({src:url,alt})} aria-label={`${alt} — rasmni kattalashtirish`}>{img}</button>:img
}
function Lightbox({photo,onClose}) {
  const close=useRef(null)
  useEffect(()=>{
    const previous=document.activeElement,overflow=document.body.style.overflow
    close.current?.focus();document.body.style.overflow='hidden'
    const key=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){e.preventDefault();close.current?.focus()}}
    document.addEventListener('keydown',key)
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus()}
  },[onClose])
  return <div className="pub-lightbox" role="dialog" aria-modal="true" aria-label={photo.alt} onClick={onClose}>
    <button ref={close} className="pub-icon-button pub-close" aria-label="Rasmni yopish" onClick={onClose}><X/></button>
    <img src={photo.src} alt={photo.alt} onClick={e=>e.stopPropagation()}/>
  </div>
}
function ProgramItem({item,saved,onSave}) {
  return <article className="pub-program">
    <div className="pub-time"><strong>{item.start_time?.slice(0,5)||'—'}</strong>{item.end_time&&<span>{item.end_time.slice(0,5)}</span>}</div>
    <div className="pub-program-body"><span className="pub-category">{categoryName(item.category)}</span><h2>{item.title}</h2>{item.speaker&&<p>{item.speaker}</p>}{item.description&&<p className="pub-muted">{item.description}</p>}</div>
    <button className={`pub-icon-button ${saved?'is-saved':''}`} onClick={()=>onSave(String(item.id))} aria-label={`${item.title}: ${saved?'saqlanganlardan olib tashlash':'saqlash'}`} aria-pressed={saved}><Bookmark fill={saved?'currentColor':'none'} aria-hidden="true"/></button>
  </article>
}
function Program({content,saved,onSave}) {
  const [query,setQuery]=useState(''),[onlySaved,setOnlySaved]=useState(false)
  const items=[...content.programs].sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''))
    .filter(item=>(!onlySaved||saved.includes(String(item.id)))&&[item.title,item.speaker,item.description,categoryName(item.category)].join(' ').toLocaleLowerCase('uz').includes(query.toLocaleLowerCase('uz')))
  return <><div className="pub-page-heading"><p className="pub-kicker">FESTIVAL KUNI</p><h1>Festival dasturi</h1><p>{dateLabel(content.settings.festival_date)} · Toshkent vaqti</p></div>
    <label className="pub-search"><Search size={20} aria-hidden="true"/><span className="pub-sr-only">Dasturdan qidirish</span><input type="search" placeholder="Mavzu yoki ishtirokchi" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="pub-filters" aria-label="Dastur filtri"><button aria-pressed={!onlySaved} onClick={()=>setOnlySaved(false)}>Barchasi ({content.programs.length})</button><button aria-pressed={onlySaved} onClick={()=>setOnlySaved(true)}>Saqlangan ({content.programs.filter(p=>saved.includes(String(p.id))).length})</button></div>
    {onlySaved&&<p className="pub-hint">Tanlangan dastur faqat shu qurilmada saqlanadi.</p>}
    <div className="pub-program-list">{items.length?items.map(item=><ProgramItem key={item.id} item={item} saved={saved.includes(String(item.id))} onSave={onSave}/>):<Empty title={onlySaved?'Saqlangan tadbir yo‘q':'Dastur topilmadi'} text={onlySaved?'Dasturdagi belgi orqali o‘zingizga qiziq tadbirlarni saqlang.':'Boshqa so‘z bilan qidiring yoki keyinroq yangilab ko‘ring.'}/>}</div>
  </>
}
function Empty({title,text}) {return <div className="pub-empty"><Leaf aria-hidden="true"/><h2>{title}</h2><p>{text}</p></div>}
function News({content,onOpen}) {
  const items=[...content.news].sort((a,b)=>String(b.published_at||'').localeCompare(String(a.published_at||'')))
  return <><div className="pub-page-heading"><p className="pub-kicker">FESTIVALDAN XABARLAR</p><h1>Yangiliklar</h1><p>E’lonlar va festival tafsilotlari.</p></div>
    <div className="pub-news-grid">{items.map(item=><article className="pub-news" key={item.id}>
      {item.image_url&&<Photo src={item.image_url} alt={item.title} onOpen={onOpen} large/>}
      <div className="pub-news-body"><time className="pub-muted">{dateLabel(item.published_at)}</time><h2>{item.title}</h2><p>{item.content}</p></div>
    </article>)}</div>{!items.length&&<Empty title="Yangiliklar tayyorlanmoqda" text="Yangi e’lonlar shu yerda ko‘rinadi."/>}
  </>
}
function Gallery({content,onOpen}) {
  const items=[...content.gallery].sort((a,b)=>(b.sort_order||0)-(a.sort_order||0))
  return <><div className="pub-page-heading"><p className="pub-kicker">YASHIL LAHZALAR</p><h1>Festival galereyasi</h1><p>Oldingi uchrashuvlardan suratlar va videolar.</p></div>
    <div className="pub-gallery">{items.map((item,index)=><figure key={item.id}>{item.media_type==='video'?<video controls preload="none" poster={safeImage(item.thumbnail_url)||undefined} src={safeImage(item.media_url)||undefined} aria-label={item.caption||`Festival videosi ${index+1}`}/>:<Photo src={item.media_url} alt={item.caption||`Festivaldan lavha ${index+1}`} onOpen={onOpen}/>}{item.caption&&<figcaption>{item.caption}</figcaption>}</figure>)}</div>
    {!items.length&&<Empty title="Galereya tayyorlanmoqda" text="Festival suratlari shu yerda e’lon qilinadi."/>}
  </>
}
function Venue({content,onError}) {
  const settings=content.settings,url=mapLink(settings)
  return <><div className="pub-page-heading"><p className="pub-kicker">UCHRASHUV JOYI</p><h1>Manzil va vaqt</h1><p>Yo‘lga chiqishdan oldin festival ma’lumotlarini tekshiring.</p></div>
    <div className="pub-venue-block"><MapPin size={32} aria-hidden="true"/><h2>{settings.festival_address||'Manzil hali e’lon qilinmagan'}</h2><p className="pub-venue-date"><CalendarDays size={20} aria-hidden="true"/>{dateLabel(settings.festival_date,{time:true})}</p>
      {url&&<button className="pub-primary" onClick={()=>openExternal(url).catch(()=>onError('Xaritani ochib bo‘lmadi. Internet aloqasini tekshiring.'))}>Xaritada ochish<ArrowUpRight size={19} aria-hidden="true"/></button>}
      {url&&<p className="pub-hint">Xarita tashqi xizmatda ochiladi. Joylashuvingizga ruxsat so‘ralmaydi.</p>}
    </div><section className="pub-text-section"><h2>Festival haqida</h2><p>Yashil Uyim — ekologiya, barqaror turmush tarzi va tabiatga e’tibor haqida uchrashuv. Dastur, suhbatlar va ijodiy mashg‘ulotlar bilan tanishing.</p><p>Ilova ma’lumot bilan tanishish uchun. U kirish chiptasi yoki to‘lov tasdig‘i hisoblanmaydi.</p></section>
  </>
}
function Welcome({content,saved,onSave}) {
  const [now]=useState(()=>Date.now())
  const date=eventDate(content.settings.festival_date),past=date&&date.getTime()+86400000<now
  const programs=[...content.programs].sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||'')).slice(0,3)
  return <><section className="pub-welcome"><div><p className="pub-kicker">EKOLOGIK FESTIVAL</p><h1>Yashil Uyim</h1><p className="pub-lead">Birga o‘rganamiz.<br/>Tabiatga yaqinlashamiz.</p><Link className="pub-primary" to="/dastur">Dastur bilan tanishish<ChevronRight size={19} aria-hidden="true"/></Link></div><img src="/main.jpg" alt="Yashil Uyim ekologik festivalining gullar bilan bezatilgan afishasi"/></section>
    <Link to="/manzil" className="pub-event-summary"><CalendarDays aria-hidden="true"/><div><strong>{dateLabel(content.settings.festival_date,{time:true})}</strong><span>{past?'Festival arxivi · ':''}{content.settings.festival_address||'Manzil e’lon qilinadi'}</span></div><ChevronRight size={19} aria-hidden="true"/></Link>
    <div className="pub-section-heading"><h2>Dasturdan lavhalar</h2><Link to="/dastur">Barchasi<ArrowUpRight size={16} aria-hidden="true"/></Link></div>
    <div className="pub-program-list">{programs.map(item=><ProgramItem key={item.id} item={item} saved={saved.includes(String(item.id))} onSave={onSave}/>)}</div>
    <div className="pub-home-links"><Link to="/yangiliklar"><Newspaper aria-hidden="true"/><div><strong>Yangiliklar</strong><span>Festivaldan {content.news.length} ta e’lon</span></div><ChevronRight aria-hidden="true"/></Link><Link to="/galereya"><Images aria-hidden="true"/><div><strong>Galereya</strong><span>Festival lahzalarini ko‘ring</span></div><ChevronRight aria-hidden="true"/></Link></div>
  </>
}
function About({content}) {
  return <><div className="pub-page-heading"><p className="pub-kicker">ILOVA HAQIDA</p><h1>Ochiq festival qo‘llanmasi</h1></div><section className="pub-text-section"><h2>Hisobsiz foydalanish</h2><p>Festival dasturi, e’lonlar, galereya va manzilni hisob ochmasdan ko‘rishingiz mumkin. Ilova telefon raqami, kamera yoki aniq joylashuvingizni so‘ramaydi.</p><h2>Qurilmada saqlanadigan ma’lumot</h2><p>Saqlangan tadbirlar va oxirgi olingan dastur nusxasi shu qurilmada qoladi. Ular foydalanuvchi hisobiga yoki serverga yuborilmaydi. Bu nusxalarni qurilmangizning ilova ma’lumotlarini tozalash sozlamasi orqali o‘chirishingiz mumkin.</p><h2>Internetsiz foydalanish</h2><p>Dastur va yangiliklar matni ilovadagi nusxadan ochiladi. Yangi ma’lumotlar, tashqi xarita va ayrim surat yoki videolar uchun internet kerak bo‘lishi mumkin.</p><h2>Tashqi xizmatlar</h2><p>Rasm yoki yangi ma’lumot yuklanganda kontent xizmatiga oddiy internet so‘rovi yuboriladi. Xaritani ochish tanlangan xarita xizmatiga olib o‘tadi. Ilovada reklama yoki tahlil kuzatuvchisi qo‘shilmagan.</p><p><Link className="pub-primary" to="/maxfiylik">Maxfiylik siyosati<ChevronRight size={18} aria-hidden="true"/></Link></p>{privacyUrl&&<p><a href={privacyUrl} target="_blank" rel="noopener noreferrer">Siyosatning veb nusxasi ↗</a></p>}<h2>Ma’lumot nusxasi</h2><p><Clock size={17} aria-hidden="true"/> {dateLabel(content.updated_at,{time:true})}</p><p>Festival tafsilotlari o‘zgarishi mumkin. So‘nggi e’lonlarni tekshirib turing.</p></section></>
}
function Privacy() {
  return <><div className="pub-page-heading"><p className="pub-kicker">YASHIL UYIM</p><h1>Maxfiylik siyosati</h1><p>Kuchga kirgan sana: 26-oktabr, 2026</p></div><section className="pub-text-section">
    <p>Yashil Uyim — festival haqidagi ochiq ma’lumot ilovasi. Quyida ilovadan foydalanganda ma’lumotlar qanday ishlatilishi bayon qilingan.</p>
    <h2>Hisob va shaxsiy ma’lumotlar</h2><p>Ro‘yxatdan o‘tish va tizimga kirish talab qilinmaydi. Ilova ism, telefon raqami, elektron pochta yoki to‘lov ma’lumotlarini kiritishni so‘ramaydi. Kontaktlar, kamera, mikrofon, suratlar kutubxonasi yoki aniq joylashuvga ruxsat talab qilinmaydi.</p>
    <h2>Qurilmada saqlash</h2><p>Ochiq festival ma’lumotlari nusxasi va saqlangan dastur tanlovlari qurilmada saqlanadi. Tanlovlar hisobga bog‘lanmaydi va bizning ma’lumotlar bazamizga yuborilmaydi. Ularni Android sozlamalarida ilova xotirasini tozalash yoki ilovani o‘chirish orqali olib tashlashingiz mumkin. iPhone’da mahalliy nusxani o‘chirish uchun ilovani butunlay o‘chiring (Delete App); Offload App ma’lumotlarni saqlab qolishi mumkin.</p>
    <h2>Internet va xizmat ko‘rsatuvchilar</h2><p>Ilova dastur, e’lonlar, rasm, video va manzilni olish uchun {contentSource==='supabase'?'Supabase va ochiq media hosting xizmatlariga':'kontent va media hosting xizmatlariga'} HTTPS orqali ulanadi. Xizmat ko‘rsatuvchilar kontentni yetkazish va xavfsizlik uchun IP manzil, so‘rov vaqti, qurilma yoki brauzer haqidagi texnik ma’lumotlar va so‘ralgan fayl manzilini olishi mumkin. Texnik jurnallar ularning o‘z siyosati va xavfsizlik talablariga muvofiq saqlanishi mumkin.</p>
    <h2>Reklama va kuzatuv</h2><p>Ilovaga reklama, xulq-atvor tahlili yoki reklama identifikatori orqali kuzatish qo‘shilmagan. Shaxsiy ma’lumotlar sotilmaydi va maqsadli reklama uchun ishlatilmaydi.</p>
    <h2>Tashqi havolalar</h2><p>Xarita, ijtimoiy tarmoq yoki boshqa saytni ochsangiz, o‘sha xizmatning maxfiylik siyosati amal qiladi. Manzil xaritasini ochish uchun ilova aniq joylashuvingizni olishni talab qilmaydi.</p>
    <h2>Xavfsizlik va bolalar</h2><p>Kontent so‘rovlari HTTPS orqali yuboriladi. Internet orqali uzatish yoki saqlashning mutlaq xavfsizligi kafolatlanmaydi. Ilova umumiy festival ma’lumotini taqdim etadi; bolalar uchun hisob ochish, shaxsiy ma’lumot yuborish yoki shaxsiylashtirilgan reklama imkoniyati mavjud emas.</p>
    <h2>O‘zgarishlar va bog‘lanish</h2><p>Ilova yoki xizmatlar o‘zgarsa, ushbu siyosat yangilanishi mumkin. So‘nggi versiya sanasi yuqorida ko‘rsatiladi. Maxfiylik bo‘yicha savollar yoki bolaga oid ma’lumot yuzasidan murojaat uchun Yashil Uyim jamoasining rasmiy sahifasi:</p><p><a href="https://www.instagram.com/yashil_uyim" target="_blank" rel="noopener noreferrer">Instagram: @yashil_uyim ↗</a></p>
  </section></>
}
function Shell() {
  const [content,setContent]=useState(initialContent),[saved,setSaved]=useState(loadSaved)
  const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[offline,setOffline]=useState(!navigator.onLine),[photo,setPhoto]=useState(null)
  const boot=useRef(null),heading=useRef(null),location=useLocation()
  useEffect(()=>{if(!status)return;const timer=setTimeout(()=>setStatus(''),7000);return()=>clearTimeout(timer)},[status])
  useEffect(()=>{
    const online=()=>setOffline(false),disconnected=()=>setOffline(true)
    window.addEventListener('online',online);window.addEventListener('offline',disconnected)
    boot.current ||= refreshContent()
    let active=true
    boot.current.then(data=>{if(active&&data)setContent(data)}).catch(()=>{if(active)setStatus('Yangilanish mavjud emas. Ilovadagi ma’lumot nusxasi ochiq.')})
    return()=>{active=false;window.removeEventListener('online',online);window.removeEventListener('offline',disconnected)}
  },[])
  useEffect(()=>{
    let active=true
    const refresh=()=>{if(document.visibilityState==='visible'&&navigator.onLine)refreshContent().then(data=>{if(active){setContent(data);setStatus('')}}).catch(()=>{})}
    window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh)
    const interval=setInterval(refresh,300000)
    return()=>{active=false;clearInterval(interval);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh)}
  },[])
  useEffect(()=>{window.scrollTo(0,0);heading.current?.focus({preventScroll:true})},[location.pathname])
  useEffect(()=>{
    if(!Capacitor.isNativePlatform())return
    let listener,disposed=false
    import('@capacitor/app').then(async({App})=>{
      const handle=await App.addListener('backButton',({canGoBack})=>{if(canGoBack)window.history.back();else App.minimizeApp()})
      if(disposed)handle.remove();else listener=handle
    }).catch(()=>{ /* Browser navigation remains available if a native bridge is unavailable. */ })
    return()=>{disposed=true;listener?.remove()}
  },[])
  const onSave=id=>{
    const next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id]
    try{storeSaved(next);setSaved(next);setStatus(next.includes(id)?'Tadbir shu qurilmada saqlandi.':'Tadbir saqlanganlardan olib tashlandi.')}catch{setStatus('Qurilmada saqlab bo‘lmadi. Dastur bilan tanishishni davom ettirishingiz mumkin.')}
  }
  const update=async()=>{setBusy(true);setStatus('');try{const data=await refreshContent();if(data)setContent(data);setStatus('Ma’lumotlar yangilandi.')}catch(error){setStatus(error.message)}finally{setBusy(false)}}
  const closePhoto=()=>setPhoto(null)
  return <div className="public-app"><header className="pub-header"><Link className="pub-brand" to="/" aria-label="Yashil Uyim bosh sahifa"><Leaf size={26} aria-hidden="true"/><span>Yashil Uyim<small>Festival qo‘llanmasi</small></span></Link><div className="pub-header-actions"><button className="pub-icon-button" onClick={update} disabled={busy} aria-label="Ma’lumotlarni yangilash"><RefreshCw className={busy?'pub-spin':''} size={20}/></button><Link className="pub-icon-button" to="/ilova" aria-label="Ilova va maxfiylik haqida"><Info size={22}/></Link></div></header>
    {offline&&<div className="pub-offline" role="status"><WifiOff size={16} aria-hidden="true"/>Internetsiz · saqlangan nusxa</div>}
    <main ref={heading} tabIndex={-1} className="pub-main" id="main-content"><Routes>
      <Route path="/" element={<Welcome content={content} saved={saved} onSave={onSave}/>}/><Route path="/dastur" element={<Program content={content} saved={saved} onSave={onSave}/>}/><Route path="/yangiliklar" element={<News content={content} onOpen={setPhoto}/>}/><Route path="/galereya" element={<Gallery content={content} onOpen={setPhoto}/>}/><Route path="/manzil" element={<Venue content={content} onError={setStatus}/>}/><Route path="/ilova" element={<About content={content}/>}/><Route path="/maxfiylik" element={<Privacy/>}/><Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes><p className="pub-data-stamp">Ma’lumot nusxasi: {dateLabel(content.updated_at)}</p></main>
    <p className="pub-live-status" role="status">{status}</p>
    <nav className="pub-tabs" aria-label="Asosiy navigatsiya">{tabs.map(tab=>{const TabIcon=tab.Icon;return <NavLink key={tab.to} to={tab.to} end={tab.to==='/'}><TabIcon size={22} aria-hidden="true"/><span>{tab.label}</span></NavLink>})}</nav>
    {photo&&<Lightbox photo={photo} onClose={closePhoto}/>}
  </div>
}
export default function PublicApp(){return <BrowserRouter><Shell/></BrowserRouter>}
