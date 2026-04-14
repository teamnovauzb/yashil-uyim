const BOT_TOKEN = process.env.BOT_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const ESKIZ_LOGIN = process.env.ESKIZ_LOGIN
const ESKIZ_PASSWORD = process.env.ESKIZ_PASSWORD

async function sendSMS(phone, message) {
  if (!ESKIZ_LOGIN || !ESKIZ_PASSWORD) return
  try {
    const tokenRes = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ESKIZ_LOGIN, password: ESKIZ_PASSWORD }),
    })
    const tokenData = await tokenRes.json()
    const token = tokenData?.data?.token
    if (!token) return

    const mobile = phone.replace(/\D/g, '')
    await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        mobile_phone: mobile,
        message,
        from: '4546',
      }),
    })
  } catch (e) {
    console.error('SMS error:', e)
  }
}

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function updateTicketStatus(id, status) {
  await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ status }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { action, ticket } = req.body || {}
  if (!action || !ticket) return res.status(400).json({ ok: false })

  const { id, chat_id, full_name, phone, ticket_count, ticket_number } = ticket

  try {
    if (action === 'allow') {
      await updateTicketStatus(id, 'approved')

      if (chat_id) {
        await sendMessage(chat_id,
          `🎟 <b>Chiptangizni oling!</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🌿 <b>YASHIL UYIM</b>\n` +
          `   Ekologik Festival\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🎟 <b>Chipta № #${ticket_number}</b>\n\n` +
          `👤 <b>${full_name}</b>\n` +
          `📱 ${phone}\n` +
          `🎫 ${ticket_count} ta chipta\n\n` +
          `📅 <b>25-aprel · Toshkent</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Festival kunida shu xabarni ko'rsating! 🌱`
        )
      }

      // SMS notification
      await sendSMS(phone,
        `Yashil Uyim: Chiptangiz tasdiqlandi! Chipta #${ticket_number}. 25-aprel, Toshkent. Festival kunida botdagi xabarni ko'rsating.`
      )
    }

    if (action === 'fake') {
      await updateTicketStatus(id, 'fake')

      if (chat_id) {
        await sendMessage(chat_id,
          `❌ <b>Chekingiz tasdiqlanmadi!</b>\n\n` +
          `Yuborgan chekingiz soxta yoki noto'g'ri.\n\n` +
          `Iltimos, haqiqiy to'lov chekini yuboring yoki admin bilan bog'laning.`
        )
      }

      // SMS notification
      await sendSMS(phone,
        `Yashil Uyim: Afsuski chekingiz tasdiqlanmadi. Haqiqiy to'lov chekini yuboring yoki admin bilan bog'laning.`
      )
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('admin-action error:', e)
    return res.status(500).json({ ok: false })
  }
}
