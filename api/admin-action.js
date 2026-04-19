import { generateToken, generateAndStoreQr } from './_qr.js'

const BOT_TOKEN = process.env.BOT_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function sendPhoto(chatId, photoUrl, caption) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' }),
  })
}

async function getSetting(key, fallback = '') {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.${encodeURIComponent(key)}&select=value`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    const j = await r.json()
    return j?.[0]?.value ?? fallback
  } catch {
    return fallback
  }
}

async function patchTicket(id, payload) {
  await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(payload),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { action, ticket } = req.body || {}
  if (!action || !ticket) return res.status(400).json({ ok: false })

  const { id, chat_id, full_name, phone, ticket_count, ticket_number } = ticket

  try {
    if (action === 'allow') {
      const token = generateToken()
      let qrUrl = null
      try {
        qrUrl = await generateAndStoreQr(token, ticket_number || id)
      } catch (e) {
        console.error('QR generation failed:', e)
      }

      await patchTicket(id, {
        status: 'approved',
        qr_token: token,
        qr_url: qrUrl,
        checked_in_count: 0,
      })

      if (chat_id) {
        const [festDate, festAddress] = await Promise.all([
          getSetting('festival_date', '2026-04-25T09:00:00'),
          getSetting('festival_address', 'Toshkent'),
        ])
        const d = new Date(festDate)
        const dateLabel = isNaN(d)
          ? '25-aprel · Toshkent'
          : `${d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })} · ${festAddress}`

        const caption =
          `🎟 <b>Chiptangiz tasdiqlandi!</b>\n\n` +
          `🌿 <b>YASHIL UYIM</b> · Ekologik Festival\n\n` +
          `🎫 Chipta № <b>#${ticket_number}</b>\n` +
          `👤 ${full_name}\n` +
          `📱 ${phone}\n` +
          `👥 ${ticket_count} kishi\n` +
          `📅 <b>${dateLabel}</b>\n\n` +
          `Festival kunida shu QR kodni ko'rsating 👇`

        if (qrUrl) {
          await sendPhoto(chat_id, qrUrl, caption)
        } else {
          await sendMessage(chat_id, caption + `\n\n⚠️ QR kod ilovada mavjud (Profil → Mening chiptalarim)`)
        }
      }
    }

    if (action === 'fake') {
      await patchTicket(id, { status: 'fake' })

      if (chat_id) {
        await sendMessage(chat_id,
          `❌ <b>Chekingiz tasdiqlanmadi!</b>\n\n` +
          `Yuborgan chekingiz soxta yoki noto'g'ri.\n\n` +
          `Iltimos, haqiqiy to'lov chekini yuboring yoki admin bilan bog'laning.`
        )
      }
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('admin-action error:', e)
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
