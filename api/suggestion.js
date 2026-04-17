const BOT_TOKEN = process.env.BOT_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

const SUPER_ADMIN_IDS = [543847007, 234471913, 6487636116]

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function updateSuggestion(id, payload) {
  await fetch(`${SUPABASE_URL}/rest/v1/suggestions?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(payload),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { type } = req.body || {}

  // ── New suggestion: notify super admins ─────────────────────
  if (type === 'new') {
    const { full_name, message, chat_id, username, phone, id } = req.body
    const text =
      `💡 <b>Yangi taklif</b>\n\n` +
      `👤 <b>${full_name || 'Mehmon'}</b>\n` +
      (username ? `✈️ @${username}\n` : '') +
      (phone ? `📱 ${phone}\n` : '') +
      (chat_id ? `💬 Chat ID: <code>${chat_id}</code>\n` : '') +
      `\n${message}\n\n` +
      `🆔 Xabar #${id}`

    await Promise.all(
      SUPER_ADMIN_IDS.map((id) => sendMessage(id, text).catch(() => {}))
    )
    return res.status(200).json({ ok: true })
  }

  // ── Admin reply: save + send DM to user ─────────────────────
  if (type === 'reply') {
    const { id, reply, chat_id, replied_by } = req.body
    if (!id || !reply) return res.status(400).json({ ok: false, error: 'missing fields' })

    await updateSuggestion(id, {
      reply,
      replied_at: new Date().toISOString(),
      replied_by: replied_by || null,
    })

    if (chat_id) {
      const text =
        `✉️ <b>Adminning javobi</b>\n\n` +
        `${reply}\n\n` +
        `<i>Yashil Uyim — Talab va Takliflar</i>`
      await sendMessage(chat_id, text).catch(() => {})
    }

    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ ok: false, error: 'unknown type' })
}
