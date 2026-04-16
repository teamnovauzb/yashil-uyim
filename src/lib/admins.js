import { supabase } from './supabase'

// Hardcoded super admins — only these accounts can promote/demote other admins.
export const SUPER_ADMIN_IDS = [543847007, 234471913, 6487636116]

let cache = null

export async function loadAdmins() {
  if (cache) return cache
  const { data, error } = await supabase
    .from('admins')
    .select('telegram_id, username, first_name, created_at')
    .order('created_at', { ascending: true })
  if (error) {
    console.warn('loadAdmins:', error.message)
    return []
  }
  cache = data || []
  return cache
}

export function invalidateAdmins() {
  cache = null
}

export async function isAdmin(telegramId) {
  if (!telegramId) return false
  if (SUPER_ADMIN_IDS.includes(Number(telegramId))) return true
  const admins = await loadAdmins()
  return admins.some((a) => Number(a.telegram_id) === Number(telegramId))
}

export function isSuperAdmin(telegramId) {
  if (!telegramId) return false
  return SUPER_ADMIN_IDS.includes(Number(telegramId))
}

export async function addAdmin({ telegramId, username, firstName, addedBy }) {
  const { error } = await supabase.from('admins').insert({
    telegram_id: Number(telegramId),
    username: username || null,
    first_name: firstName || null,
    is_super: false,
    added_by: addedBy ? Number(addedBy) : null,
  })
  invalidateAdmins()
  if (error) throw error
}

export async function removeAdmin(telegramId) {
  const { error } = await supabase
    .from('admins')
    .delete()
    .eq('telegram_id', Number(telegramId))
  invalidateAdmins()
  if (error) throw error
}
