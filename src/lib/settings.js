import { supabase } from './supabase'

export async function getSetting(key, fallback = '') {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) {
    console.warn('getSetting:', error.message)
    return fallback
  }
  return data?.value ?? fallback
}

export async function setSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
}
