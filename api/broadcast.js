// Super-admin broadcast: DM every user in the `users` table from the bot.
// Used when a new event is announced or any general announcement is needed.

const BOT_TOKEN    = process.env.BOT_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
}

// Telegram allows ~30 msgs/sec to different chats. Stay under that.
const SEND_DELAY_MS = 40

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

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
  // Anyone who started the bot
  const u = await fetch(`${SUPABASE_URL}/rest/v1/users?select=telegram_id`, { headers: HEADERS })
  const users = await u.json().catch(() => [])
  if (Array.isArray(users)) users.forEach(x => x?.telegram_id && ids.add(String(x.telegram_id)))
  // Plus anyone who ever bought a ticket — covers users who skipped contact share but did purchase
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

async function sendOne(chatId, text) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  return r.ok
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { tg_id, mode } = req.body || {}
  if (!tg_id) return res.status(401).json({ ok: false, reason: 'missing_tg_id' })

  const allowed = await isSuperAdmin(tg_id)
  if (!allowed) return res.status(403).json({ ok: false, reason: 'not_super_admin' })

  try {
    // Currently only the auto event-announcement template is supported.
    if (mode !== 'event_announcement') {
      return res.status(400).json({ ok: false, reason: 'unknown_mode' })
    }

    const message = await buildEventAnnouncement()
    const chatIds = await listUserChatIds()

    let sent = 0
    let failed = 0
    for (const id of chatIds) {
      const ok = await sendOne(id, message)
      if (ok) sent++
      else failed++
      await sleep(SEND_DELAY_MS)
    }

    return res.status(200).json({
      ok: true,
      recipients: chatIds.length,
      sent,
      failed,
    })
  } catch (e) {
    console.error('broadcast error:', e)
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
