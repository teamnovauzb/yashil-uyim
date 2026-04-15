const BOT_TOKEN = process.env.BOT_TOKEN
const ADMIN_IDS = ['5803735374', '543847007']

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
  const allowData = `allow|${chatId}|${ticket_number}`
  const fakeData  = `fake|${chatId}|${ticket_number}`

  const buttons = {
    inline_keyboard: [[
      { text: '✅ Allow', callback_data: allowData },
      { text: '❌ Fake',  callback_data: fakeData  },
    ]],
  }

  try {
    await Promise.all(ADMIN_IDS.map(async (adminId) => {
      if (receipt_url) {
        await sendPhoto(adminId, receipt_url, caption, buttons)
      } else {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminId,
            text: caption,
            parse_mode: 'HTML',
            reply_markup: buttons,
          }),
        })
      }
    }))
  } catch (e) {
    console.error('notify error:', e)
  }

  return res.status(200).json({ ok: true })
}
