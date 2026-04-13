const BOT_TOKEN = process.env.BOT_TOKEN
const ADMIN_ID = '5803735374'

async function sendPhoto(chatId, photoUrl, caption, replyMarkup) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  })
}

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { chatId, username, full_name, phone, ticket_count, ticket_number, receipt_url } = req.body || {}

  const caption =
    `📋 <b>Yangi chipta so'rovi!</b>\n\n` +
    `👤 Ism: <b>${full_name}</b>\n` +
    `${username ? `🆔 @${username}\n` : ''}` +
    `📱 Telefon: <b>${phone}</b>\n` +
    `🎫 Chipta soni: <b>${ticket_count}</b>\n` +
    `🔢 Chipta №: <b>#${ticket_number}</b>\n` +
    `${chatId ? `💬 Chat ID: <code>${chatId}</code>` : ''}`

  // callback_data: "approve|chatId|ticketNum" (max 64 chars)
  const approveData = `approve|${chatId}|${ticket_number}`
  const rejectData  = `reject|${chatId}|${ticket_number}`

  try {
    if (receipt_url) {
      await sendPhoto(ADMIN_ID, receipt_url, caption, {
        inline_keyboard: [[
          { text: '✅ Tasdiqlash', callback_data: approveData },
          { text: '❌ Rad etish',  callback_data: rejectData  },
        ]],
      })
    } else {
      await sendMessage(ADMIN_ID, caption)
    }
  } catch (e) {
    console.error('notify error:', e)
  }

  return res.status(200).json({ ok: true })
}
