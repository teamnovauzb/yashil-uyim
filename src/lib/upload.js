import { supabase } from './supabase'

export async function uploadImage(file, folder = 'misc') {
  if (!file) return null
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}
