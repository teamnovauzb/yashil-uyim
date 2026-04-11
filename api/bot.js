const BOT_TOKEN = process.env.BOT_TOKEN
const APP_URL = 'https://yashil-uyim.vercel.app'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true })
  }

  const { message } = req.body || {}
  if (!message) return res.status(200).json({ ok: true })

  const chatId = message.chat.id
  const text = message.text || ''
  const firstName = message.from?.first_name || 'Mehmon'

  if (text === '/start') {
    await sendMessage(
      chatId,
      `Salom, <b>${firstName}</b>! 👋\n\nBu botda siz <b>Yashil Uyim</b> festivaliga chipta olishingiz mumkin.\n\n🌿 Festival: <b>Har oy, Toshkent</b>\n🎟 Kirish bepul — faqat ro'yxatdan o'ting!`,
      {
        inline_keyboard: [
          [
            {
              text: '🌿 Ilovani ochish',
              web_app: { url: APP_URL },
            },
          ],
        ],
      }
    )
  }

  return res.status(200).json({ ok: true })
}
