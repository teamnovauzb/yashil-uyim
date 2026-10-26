import { publishContent } from './public-content.js'
import { readSupabasePublicContent as readSupabaseRows } from '../../shared/supabase-public.js'

function httpsOrigin(value, name) {
  let url
  try { url=new URL(value) } catch { throw new Error(`Set ${name} to an HTTPS origin`) }
  if(url.protocol!=='https:'||url.origin!==value||url.username||url.password||/SET_THE_|example/i.test(url.hostname))throw new Error(`Set ${name} to an HTTPS origin`)
  return url.origin
}
function publicKey(key) {
  if(typeof key!=='string'||!key)throw new Error('Set GUEST_SUPABASE_PUBLIC_KEY')
  if(/^sb_publishable_[\w-]+$/.test(key))return key
  try {
    const parts=key.split('.')
    if(parts.length===3&&JSON.parse(Buffer.from(parts[1],'base64url').toString()).role==='anon')return key
  }catch{ /* Only the legacy anon role or a publishable key is accepted. */ }
  throw new Error('Use a Supabase publishable/anon key, never a secret or service-role key')
}
export function publicSourceConfig(env=process.env) {
  const source=env.PUBLIC_CONTENT_SOURCE||'supabase'
  if(!['supabase','vps'].includes(source))throw new Error('PUBLIC_CONTENT_SOURCE must be supabase or vps')
  if(source==='supabase')return {source,origin:httpsOrigin(env.GUEST_SUPABASE_URL,'GUEST_SUPABASE_URL'),key:publicKey(env.GUEST_SUPABASE_PUBLIC_KEY)}
  const origin=httpsOrigin(env.GUEST_VPS_ORIGIN,'GUEST_VPS_ORIGIN')
  if(env.GUEST_API_ORIGIN&&origin===env.GUEST_API_ORIGIN.replace(/\/$/,''))throw new Error('The VPS upstream must differ from the guest gateway origin')
  return {source,origin}
}
async function jsonGet(url,headers,fetchImpl,signal) {
  const response=await fetchImpl(url,{method:'GET',headers,credentials:'omit',redirect:'error',signal})
  if(!response.ok)throw new Error('Public content source unavailable')
  return response.json()
}
function checkedContent(data) {
  const rows=table=>Array.isArray(data[table])&&data[table].length<=1000&&data[table].every(row=>['string','number'].includes(typeof row.id))
  if(!['programs','news','gallery'].every(rows)||!data.programs.every(row=>typeof row.title==='string')||!data.news.every(row=>typeof row.title==='string'&&typeof row.content==='string')||!data.gallery.every(row=>['image','video'].includes(row.media_type)))throw new Error('Invalid published content fields')
  return data
}
export async function readSupabasePublicContent(...args) { return checkedContent(await readSupabaseRows(...args)) }
export async function readPublicSource(config,fetchImpl=fetch) {
  const signal=AbortSignal.timeout(10000)
  if(config.source==='supabase')return readSupabasePublicContent(config,fetchImpl,signal)
  const data=await jsonGet(`${config.origin}/api/public/content`,{},fetchImpl,signal)
  if(data?.version!==1||!Number.isFinite(Date.parse(data.updated_at))||!['programs','news','gallery'].every(key=>Array.isArray(data[key])&&data[key].length<=1000&&data[key].every(row=>row&&typeof row==='object'&&!Array.isArray(row)))||!data.settings||typeof data.settings!=='object'||Array.isArray(data.settings))throw new Error('Invalid VPS public content response')
  // Keep the same whitelist even if the upstream response gains additional fields later.
  return checkedContent(publishContent({...data,settings:Object.entries(data.settings).map(([key,value])=>({key,value}))},value=>value,data.updated_at))
}
