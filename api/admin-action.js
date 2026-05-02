import { generateSeats } from './_qr.js'

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

async function deleteSeats(ticketId) {
  await fetch(`${SUPABASE_URL}/rest/v1/ticket_seats?ticket_id=eq.${ticketId}`, {
    method: 'DELETE',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  })
}

async function insertSeats(rows) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ticket_seats`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`Seat insert failed: ${r.status} ${text}`)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { action, ticket } = req.body || {}
  if (!action || !ticket) return res.status(400).json({ ok: false })

  const { id, chat_id, full_name, phone, ticket_count, ticket_number } = ticket

  try {
    if (action === 'allow') {
      const seatCount = Math.max(1, Number(ticket_count) || 1)
      let seats = []
      try {
        seats = await generateSeats(ticket_number || id, seatCount)
      } catch (e) {
        console.error('QR generation failed:', e)
      }

      // Replace any prior seats (idempotent re-approval), then insert fresh.
      try {
        await deleteSeats(id)
        if (seats.length) {
          await insertSeats(seats.map(s => ({ ...s, ticket_id: id })))
        }
      } catch (e) {
        console.error('Seat persist failed:', e)
      }

      // Keep tickets.qr_token / qr_url populated with seat 1 for backward compat.
      await patchTicket(id, {
        status: 'approved',
        qr_token: seats[0]?.qr_token || null,
        qr_url:   seats[0]?.qr_url   || null,
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

        const baseCaption =
          `🎟 <b>Chiptangiz tasdiqlandi!</b>\n\n` +
          `🌿 <b>YASHIL UYIM</b> · Ekologik Festival\n\n` +
          `🎫 Chipta № <b>#${ticket_number}</b>\n` +
          `👤 ${full_name}\n` +
          `📱 ${phone}\n` +
          `👥 ${seatCount} kishi\n` +
          `📅 <b>${dateLabel}</b>`

        if (!seats.length) {
          await sendMessage(chat_id, baseCaption + `\n\n⚠️ QR kod ilovada mavjud (Profil → Mening chiptalarim)`)
        } else if (seats.length === 1) {
          await sendPhoto(chat_id, seats[0].qr_url, baseCaption + `\n\nFestival kunida shu QR kodni ko'rsating 👇`)
        } else {
          // Send a header explaining N QRs, then each QR with its seat label.
          await sendMessage(chat_id,
            baseCaption +
            `\n\n📥 Sizga ${seatCount} ta QR kod yuborilmoqda — har biri bir kishiga, bir martagina ishlaydi.\n` +
            `Kim bilan kelyapsiz, har biriga bittadan QR ulashing 👇`
          )
          for (const seat of seats) {
            await sendPhoto(
              chat_id,
              seat.qr_url,
              `🎟 <b>QR ${seat.seat_index}/${seatCount}</b> · #${ticket_number}`
            )
          }
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
