import { generateToken, generateAndStoreQr } from './_qr.js'

const BOT_TOKEN = process.env.BOT_TOKEN
const APP_URL = 'https://yashiluyim.vercel.app'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

async function getSetting(key, fallback = '') {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.${encodeURIComponent(key)}&select=value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    })
    const data = await res.json()
    return data?.[0]?.value ?? fallback
  } catch {
    return fallback
  }
}

async function updateTicketStatus(ticketNumber, status) {
  await fetch(`${SUPABASE_URL}/rest/v1/tickets?ticket_number=eq.${ticketNumber}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ status }),
  })
}

async function patchTicketByNumber(ticketNumber, payload) {
  await fetch(`${SUPABASE_URL}/rest/v1/tickets?ticket_number=eq.${ticketNumber}`, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(payload),
  })
}

async function sendPhoto(chatId, photoUrl, caption) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' }),
  })
}

async function sendMessage(chatId, text, replyMarkup) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  })
}

async function answerCallback(callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  })
}

async function editMessageReplyMarkup(chatId, messageId) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true })

  const body = req.body || {}

  // ── Handle admin button callbacks ──────────────────────────
  if (body.callback_query) {
    const { id, data, message } = body.callback_query
    const [action, chatId, ticketNum] = (data || '').split('|')

    if (action === 'allow' && chatId) {
      await editMessageReplyMarkup(message.chat.id, message.message_id)
      await answerCallback(id, '✅ Allowed!')

      // Parse ticket info from admin message caption
      const caption = message.caption || message.text || ''
      const clean = caption.replace(/<[^>]+>/g, '')
      const get = (label) => {
        const line = clean.split('\n').find(l => l.includes(label))
        return line ? line.split(label)[1].trim() : ''
      }
      const full_name    = get('Ism:')
      const phone        = get('Telefon:')
      const ticket_count = get('Chipta soni:')
      const usernameLine = clean.split('\n').find(l => l.startsWith('🆔 @'))
      const username     = usernameLine ? usernameLine.replace('🆔 @', '').trim() : null

      const [festDate, festAddress] = await Promise.all([
        getSetting('festival_date', '2026-04-25T09:00:00'),
        getSetting('festival_address', 'Toshkent'),
      ])
      const d = new Date(festDate)
      const dateLabel = isNaN(d)
        ? '25-aprel · Toshkent'
        : `${d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })} · ${festAddress}`

      const token = generateToken()
      let qrUrl = null
      try {
        qrUrl = await generateAndStoreQr(token, ticketNum)
      } catch (e) {
        console.error('QR generation failed:', e)
      }

      await patchTicketByNumber(ticketNum, {
        status: 'approved',
        qr_token: token,
        qr_url: qrUrl,
        checked_in_count: 0,
      })

      const caption =
        `🎟 <b>Chiptangiz tasdiqlandi!</b>\n\n` +
        `🌿 <b>YASHIL UYIM</b> · Ekologik Festival\n\n` +
        `🎫 Chipta № <b>#${ticketNum}</b>\n` +
        `👤 ${full_name}\n` +
        (username ? `✈️ @${username}\n` : '') +
        `📱 ${phone}\n` +
        `👥 ${ticket_count} kishi\n` +
        `📅 <b>${dateLabel}</b>\n\n` +
        `Festival kunida shu QR kodni ko'rsating 👇`

      if (qrUrl) {
        await sendPhoto(chatId, qrUrl, caption)
      } else {
        await sendMessage(chatId, caption + `\n\n⚠️ QR kod ilovada mavjud (Profil → Mening chiptalarim)`)
      }
      await sendMessage(message.chat.id, `✅ #${ticketNum} — chipta yuborildi.`)
    }

    if (action === 'fake' && chatId) {
      await editMessageReplyMarkup(message.chat.id, message.message_id)
      await answerCallback(id, '❌ Fake!')

      await updateTicketStatus(ticketNum, 'fake')
      await sendMessage(chatId,
        `❌ <b>Chekingiz tasdiqlanmadi!</b>\n\n` +
        `Yuborgan chekingiz soxta yoki noto'g'ri.\n\n` +
        `Iltimos, haqiqiy to'lov chekini yuboring yoki admin bilan bog'laning.`
      )
      await sendMessage(message.chat.id, `❌ #${ticketNum} — fake deb belgilandi.`)
    }

    return res.status(200).json({ ok: true })
  }

  // ── Handle /start command ───────────────────────────────────
  const { message } = body
  if (!message) return res.status(200).json({ ok: true })

  const chatId  = message.chat.id
  const text    = message.text || ''
  const firstName = message.from?.first_name || 'Mehmon'

  if (text === '/start' || text === '/help') {
    await sendMessage(
      chatId,
      `Salom, <b>${firstName}</b>! 🌿\n\n` +
      `<b>Yashil Uyim</b> — Toshkentda o'tkaziladigan ekologik festival bo'lib, tabiat, barqaror turmush va yashil texnologiyalarga bag'ishlangan.\n\n` +
      `Ilova orqali siz:\n` +
      `🎟 Festivalga chipta olishingiz\n` +
      `📋 Dastur va ma'ruzachilar bilan tanishishingiz\n` +
      `📰 Yangiliklarni kuzatishingiz\n` +
      `💡 O'z taklifingizni yuborishingiz mumkin.\n\n` +
      `Quyidagi tugmani bosing va ishni boshlang 👇`,
      {
        inline_keyboard: [[
          { text: '🌿 Ilovani ochish', web_app: { url: APP_URL } },
        ]],
      }
    )
  }

  return res.status(200).json({ ok: true })
}
