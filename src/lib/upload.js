import { supabase } from './supabase'

// 1 year in seconds. Filenames embed a unique timestamp so a "permanent"
// browser/CDN cache is safe — overwrites would land at a different path.
// Lifting this cuts Supabase Storage egress dramatically since repeat views
// of the same image stop re-downloading every hour (Supabase's default).
const LONG_CACHE = '31536000, immutable'

// Upload any file (image, video, etc.) to the `media` bucket under the given
// folder. Returns the public URL.
export async function uploadFile(file, folder = 'misc') {
  if (!file) return null
  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase()
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: file.type, upsert: true, cacheControl: LONG_CACHE })
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
    .upload(path, file, { contentType: file.type, upsert: true, cacheControl: LONG_CACHE })
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
