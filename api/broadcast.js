// Super-admin broadcast: creates a background job and returns immediately.
// The /api/cron-broadcast-worker endpoint drains the job in batches (cron
// runs every minute), so this scales past Vercel's 10-second timeout.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const CRON_SECRET  = process.env.CRON_SECRET

const HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
}

async function isSuperAdmin(telegramId) {
  if (!telegramId) return false
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/admins?telegram_id=eq.${telegramId}&select=is_super`,
    { headers: HEADERS }
  )
  const data = await r.json()
  return Array.isArray(data) && data[0]?.is_super === true
}

async function listUserChatIds() {
  const ids = new Set()
  const u = await fetch(`${SUPABASE_URL}/rest/v1/users?select=telegram_id`, { headers: HEADERS })
  const users = await u.json().catch(() => [])
  if (Array.isArray(users)) users.forEach(x => x?.telegram_id && ids.add(String(x.telegram_id)))
  const t = await fetch(`${SUPABASE_URL}/rest/v1/tickets?select=chat_id&chat_id=not.is.null`, { headers: HEADERS })
  const tickets = await t.json().catch(() => [])
  if (Array.isArray(tickets)) tickets.forEach(x => x?.chat_id && ids.add(String(x.chat_id)))
  return Array.from(ids)
}

async function getSetting(key, fallback = '') {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/settings?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: HEADERS }
    )
    const j = await r.json()
    return j?.[0]?.value ?? fallback
  } catch {
    return fallback
  }
}

async function buildEventAnnouncement() {
  const [festDateRaw, address] = await Promise.all([
    getSetting('festival_date', ''),
    getSetting('festival_address', 'Toshkent'),
  ])
  const d = festDateRaw ? new Date(festDateRaw) : null
  let dateLabel = '—'
  if (d && !isNaN(d)) {
    dateLabel = d.toLocaleDateString('uz-UZ', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    const pad = (n) => String(n).padStart(2, '0')
    dateLabel += ` · ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return (
    `🌿 <b>Yangi tadbir e'loni!</b>\n\n` +
    `<b>YASHIL UYIM</b> — Ekologik Festival\n\n` +
    `📅 <b>${dateLabel}</b>\n` +
    `📍 ${address}\n\n` +
    `Chipta olish va dastur bilan tanishish uchun ilovani oching 👇`
  )
}

async function createJob({ message, recipients, createdBy }) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/broadcasts`, {
    method: 'POST',
    headers: { ...HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify([{
      message,
      recipients,
      created_by: createdBy,
    }]),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`Job insert failed: ${r.status} ${text}`)
  }
  const data = await r.json()
  return Array.isArray(data) ? data[0] : data
}

// Kick the worker so the first batch goes out within seconds, without
// waiting for the next cron tick. We don't await — fire-and-forget.
function kickWorker(host) {
  if (!host) return
  if (!CRON_SECRET) return
  const url = `https://${host}/api/cron-broadcast-worker`
  // Plain fetch; ignore failure. The cron will pick it up either way.
  fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  }).catch(() => {})
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { tg_id, mode } = req.body || {}
  if (!tg_id) return res.status(401).json({ ok: false, reason: 'missing_tg_id' })

  const allowed = await isSuperAdmin(tg_id)
  if (!allowed) return res.status(403).json({ ok: false, reason: 'not_super_admin' })

  if (mode !== 'event_announcement') {
    return res.status(400).json({ ok: false, reason: 'unknown_mode' })
  }

  try {
    const message    = await buildEventAnnouncement()
    const recipients = await listUserChatIds()

    if (recipients.length === 0) {
      return res.status(200).json({ ok: true, queued: false, recipients: 0 })
    }

    const job = await createJob({ message, recipients, createdBy: tg_id })

    // Trigger first batch immediately. Don't await — return to the admin now.
    kickWorker(req.headers?.host || req.headers?.['x-forwarded-host'])

    return res.status(200).json({
      ok:         true,
      queued:     true,
      job_id:     job?.id,
      recipients: recipients.length,
    })
  } catch (e) {
    console.error('broadcast error:', e)
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
