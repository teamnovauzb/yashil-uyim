import { supabase } from './supabase'

// Upload any file (image, video, etc.) to the `media` bucket under the given
// folder. Returns the public URL.
export async function uploadFile(file, folder = 'misc') {
  if (!file) return null
  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase()
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

// Convenience wrapper for image-only callers (NewsView/ProgramView). Kept so
// existing imports don't break; defaults the extension fallback to .jpg which
// is more reasonable for images than .bin.
export async function uploadImage(file, folder = 'misc') {
  if (!file) return null
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

// Given a public URL pointing at the `media` bucket, return the storage path
// (the part after `/media/`) so it can be passed to `storage.remove()`.
export function pathFromMediaUrl(url) {
  if (!url) return null
  const m = url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/)
  return m ? decodeURIComponent(m[1]) : null
}
