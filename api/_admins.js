// Shared server-side super-admin check. Kept in sync with the same hardcoded
// list in src/lib/admins.js so any user there treated as super is also
// recognised by the bot and the broadcast endpoint.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

export const SUPER_ADMIN_IDS = [543847007, 234471913, 6487636116]

export async function isSuperAdmin(telegramId) {
  if (!telegramId) return false
  if (SUPER_ADMIN_IDS.includes(Number(telegramId))) return true
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/admins?telegram_id=eq.${telegramId}&select=is_super`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const data = await r.json()
    return Array.isArray(data) && data[0]?.is_super === true
  } catch {
    return false
  }
}
