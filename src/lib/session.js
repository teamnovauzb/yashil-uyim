import { apiBase, isNative } from './runtime'

let accessToken = null
let sessionUser = null
let refreshing = null
let embeddedRefresh = null
const embedded = !isNative && !!window.Telegram?.WebApp?.initData
const clientType = isNative ? 'native' : embedded ? 'embedded' : 'web'
const storageKey = 'yashiluyim.refresh'
export const getSessionUser = () => sessionUser
export const setSessionUser = user => { sessionUser=user;window.dispatchEvent(new Event('yu-session')) }
const secureStore = async () => (await import('@aparajita/capacitor-secure-storage')).SecureStorage
async function refreshCredential() { return isNative ? (await secureStore()).get(storageKey,false,false) : embeddedRefresh }
async function saveTokens(tokens) {
  accessToken=tokens.access_token
  if(isNative && tokens.refresh_token) await (await secureStore()).set(storageKey,tokens.refresh_token,false,false)
  if(embedded) embeddedRefresh=tokens.refresh_token
}
async function authRequest(path,body) {
  const response=await fetch(apiBase+path,{method:'POST',credentials:clientType==='web'?'include':'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,client:clientType})})
  const data=await response.json()
  if(!response.ok) throw Object.assign(new Error(data.message||'Kirish amalga oshmadi'),{status:response.status})
  return data
}
export async function refreshSession() {
  if(!refreshing) refreshing=(async()=>{
    try {
      await saveTokens(await authRequest('/api/auth/refresh',{refresh_token:await refreshCredential()}))
      return true
    } catch(error) {
      if(error.status===401){accessToken=null;embeddedRefresh=null;setSessionUser(null);if(isNative) await (await secureStore()).remove(storageKey,false);return false}
      throw error
    }
  })().finally(()=>{refreshing=null})
  return refreshing
}
export async function apiFetch(path,options={}) {
  const sentToken=accessToken
  const send=()=>fetch(apiBase+path,{...options,credentials:clientType==='web'?'include':'omit',headers:{...options.headers,...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})}})
  let response=await send()
  if(response.status===401&&((accessToken&&accessToken!==sentToken)||await refreshSession())) response=await send()
  return response
}
export async function apiJson(path,options={}) {
  const response=await apiFetch(path,options),data=await response.json()
  if(!response.ok) throw Object.assign(new Error(data.message||'So‘rov bajarilmadi'),{status:response.status})
  return data
}
export async function loadMe() { const user=await apiJson('/api/auth/me');setSessionUser(user);return user }
export async function restoreSession() {
  const initData=window.Telegram?.WebApp?.initData
  if(initData) {
    await saveTokens(await authRequest('/api/auth/telegram',{init_data:initData}))
    return loadMe()
  }
  if(await refreshSession()) return loadMe()
  return null
}
export async function startLogin() {
  const bytes=crypto.getRandomValues(new Uint8Array(32))
  const verifier=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')
  return {...await authRequest('/api/auth/start',{verifier}),verifier}
}
export async function verifyLogin(challenge,verifier,code) {
  await saveTokens(await authRequest('/api/auth/verify',{challenge,verifier,code}))
  return loadMe()
}
export async function logout() {
  await apiJson('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:await refreshCredential()})})
  accessToken=null
  embeddedRefresh=null
  if(isNative) await (await secureStore()).remove(storageKey,false)
  setSessionUser(null)
}
