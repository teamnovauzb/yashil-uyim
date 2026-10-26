import bundled from './content.json'
import { readSupabasePublicContent } from '../../shared/supabase-public.js'

const contentKey='yashiluyim.public.content.v1',savedKey='yashiluyim.public.saved.v1'
export const contentApi=(import.meta.env.VITE_PUBLIC_API_URL||'').replace(/\/$/,'')
export const contentSource=import.meta.env.VITE_PUBLIC_CONTENT_SOURCE||'api'
const supabaseOrigin=(import.meta.env.VITE_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'')
const supabaseKey=import.meta.env.VITE_PUBLIC_SUPABASE_KEY||''
if(!['api','supabase'].includes(contentSource))throw new Error('Invalid public content source')
export const privacyUrl=import.meta.env.VITE_PUBLIC_PRIVACY_URL||''
if(privacyUrl) {
  const url=new URL(privacyUrl)
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('Privacy policy requires an HTTPS URL')
}
if(contentApi) {
  const url=new URL(contentApi)
  if(url.origin!==contentApi||url.username||url.password||!(url.protocol==='https:'||(import.meta.env.DEV&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw new Error('Public content requires an HTTPS origin')
}
export function validContent(value) {
  const rows=key=>Array.isArray(value?.[key])&&value[key].length<=1000&&value[key].every(row=>row&&['string','number'].includes(typeof row.id))
  return value?.version===1&&typeof value.updated_at==='string'&&Number.isFinite(Date.parse(value.updated_at))&&['programs','news','gallery'].every(rows)
    &&value.programs.every(row=>typeof row.title==='string')&&value.news.every(row=>typeof row.title==='string'&&typeof row.content==='string')
    &&value.programs.every(row=>['description','speaker','category','start_time','end_time'].every(key=>row[key]==null||typeof row[key]==='string'))
    &&value.gallery.every(row=>['image','video'].includes(row.media_type)&&(row.caption==null||typeof row.caption==='string'))&&value.settings&&typeof value.settings==='object'&&!Array.isArray(value.settings)&&Object.values(value.settings).every(v=>typeof v==='string')
}
export function initialContent() {
  try {const cached=JSON.parse(localStorage.getItem(contentKey));if(validContent(cached)&&Date.parse(cached.updated_at)>Date.parse(bundled.updated_at))return cached}catch{/* A private-mode or full device store must not prevent reading. */}
  return bundled
}
export async function refreshContent() {
  let data
  try {
  if(contentSource==='supabase')data=await readSupabasePublicContent({origin:supabaseOrigin,key:supabaseKey})
  else {
    const response=await fetch(`${contentApi}/api/public/content`,{method:'GET',credentials:'omit',signal:AbortSignal.timeout(15000),cache:'no-store'})
    if(!response.ok)throw new Error('Ma’lumotlarni yangilab bo‘lmadi. Saqlangan nusxa ochiq qoladi.')
    data=await response.json()
  }
  } catch {throw new Error('Ma’lumotlarni yangilab bo‘lmadi. Saqlangan nusxa ochiq qoladi.')}
  if(!validContent(data))throw new Error('Ma’lumot formati mos emas. Saqlangan nusxa ochiq qoladi.')
  try{localStorage.setItem(contentKey,JSON.stringify(data))}catch{/* Reading still works when persistent storage is unavailable. */}
  return data
}
export function loadSaved() {
  try{const value=JSON.parse(localStorage.getItem(savedKey));return Array.isArray(value)?value.filter(x=>typeof x==='string'):[]}catch{return []}
}
export function storeSaved(ids) {localStorage.setItem(savedKey,JSON.stringify(ids))}
export function safeImage(value) {
  if(typeof value!=='string')return null
  if(/^\/[^/]/.test(value))return value
  try{const url=new URL(value);return url.protocol==='https:'||(import.meta.env.DEV&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))?url.href:null}catch{return null}
}
export const categoryName=value=>({'suhbat':'Suhbat','master-klass':'Master-klass','konsert':'Konsert',"ko'rgazma":'Ko‘rgazma',boshqa:'Tadbir'})[value]||'Tadbir'
export function eventDate(value) {
  if(!value)return null
  const date=new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)?value+'+05:00':value)
  return Number.isFinite(date.getTime())?date:null
}
export function dateLabel(value,{time=false}={}) {
  const date=eventDate(value)
  if(!date)return 'Sana hali e’lon qilinmagan'
  const months=['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr']
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'numeric',year:'numeric',timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(part=>[part.type,part.value]))
  return `${parts.day}-${months[Number(parts.month)-1]}, ${parts.year}${time?` · ${parts.hour}:${parts.minute}`:''}`
}
export function mapLink(settings) {
  if(settings.festival_yandex_url)try{const u=new URL(settings.festival_yandex_url);if(u.protocol==='https:'&&['yandex.uz','yandex.ru','yandex.com'].includes(u.hostname))return u.href}catch{/* Fall through to published coordinates. */}
  const lat=Number(settings.festival_lat),lng=Number(settings.festival_lng)
  if(settings.festival_lat&&settings.festival_lng&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  return null
}
