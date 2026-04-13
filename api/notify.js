const BOT_TOKEN = process.env.BOT_TOKEN
const ADMIN_ID = '5803735374'

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { chatId, full_name, username, phone, ticket_count } = req.body || {}

  const userMsg =
    `🎟 <b>Tabriklaymiz! Chiptangiz tayyor!</b>\n\n` +
    `👤 Ism: <b>${full_name}</b>\n` +
    `${username ? `🆔 Username: @${username}\n` : ''}` +
    `📱 Telefon: <b>${phone}</b>\n` +
    `🎫 Chipta soni: <b>${ticket_count}</b>\n\n` +
    `🌿 <b>Yashil Uyim Ekologik Festival</b>\n` +
    `📅 25-aprel · Toshkent\n\n` +
    `Festival kunida shu xabarni ko'rsating!`

  const adminMsg =
    `📋 <b>Yangi chipta ro'yxatdan o'tdi!</b>\n\n` +
    `👤 Ism: <b>${full_name}</b>\n` +
    `${username ? `🆔 @${username}\n` : ''}` +
    `📱 Telefon: <b>${phone}</b>\n` +
    `🎫 Chipta soni: <b>${ticket_count}</b>\n` +
    `${chatId ? `🆔 Chat ID: <code>${chatId}</code>` : ''}`

  try {
    if (chatId) await sendMessage(chatId, userMsg)
    await sendMessage(ADMIN_ID, adminMsg)
  } catch (e) {
    console.error('Telegram notify error:', e)
  }

  return res.status(200).json({ ok: true })
}
