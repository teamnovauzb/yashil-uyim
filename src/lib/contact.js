import { supabase } from './supabase'

const keyFor = (tgUser) =>
  tgUser?.id ? `tg_contact_${tgUser.id}` : null

export function getCachedPhone(tgUser) {
  const k = keyFor(tgUser)
  if (!k) return ''
  try {
    const raw = localStorage.getItem(k)
    if (!raw) return ''
    return JSON.parse(raw).phone || ''
  } catch {
    return ''
  }
}

export function isContacted(tgUser) {
  const k = keyFor(tgUser)
  if (!k) return false
  return localStorage.getItem(k) !== null
}

export function markContacted(tgUser, phone) {
  const k = keyFor(tgUser)
  if (!k) return
  localStorage.setItem(k, JSON.stringify({ phone: phone || '' }))
}

export async function saveContactToDb(tgUser, phone) {
  if (!tgUser?.id) return
  const { error } = await supabase.from('users').upsert(
    {
      telegram_id: tgUser.id,
      username: tgUser.username || null,
      first_name: tgUser.first_name || null,
      last_name: tgUser.last_name || null,
      phone: phone || null,
    },
    { onConflict: 'telegram_id' }
  )
  if (error) console.warn('saveContactToDb failed:', error.message)
}

export async function loadContactFromDb(tgUser) {
  if (!tgUser?.id) return null
  const { data, error } = await supabase
    .from('users')
    .select('phone')
    .eq('telegram_id', tgUser.id)
    .maybeSingle()
  if (error) {
    console.warn('loadContactFromDb failed:', error.message)
    return null
  }
  return data?.phone || null
}

export async function isTester(tgUser) {
  if (!tgUser?.id) return false
  const { data } = await supabase
    .from('users')
    .select('is_tester')
    .eq('telegram_id', tgUser.id)
    .maybeSingle()
  return !!data?.is_tester
}
