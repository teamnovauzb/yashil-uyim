const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
}

async function findTicket(token) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/tickets?qr_token=eq.${encodeURIComponent(token)}&select=*`,
    { headers: HEADERS }
  )
  const data = await r.json()
  return Array.isArray(data) ? data[0] : null
}

async function bumpCheckin(id, currentCount, addCount, ticketCount) {
  // Conditional update — fails (returns []) if checked_in_count was changed by a concurrent scan
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/tickets?id=eq.${id}&checked_in_count=eq.${currentCount}`,
    {
      method: 'PATCH',
      headers: { ...HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify({
        checked_in_count: currentCount + addCount,
        last_checkin_at:  new Date().toISOString(),
      }),
    }
  )
  const data = await r.json()
  if (!Array.isArray(data) || data.length === 0) return null
  return data[0]
}

async function reset(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify({ checked_in_count: 0, last_checkin_at: null }),
  })
  const data = await r.json()
  return Array.isArray(data) ? data[0] : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  try {
    const { token, count, mode } = req.body || {}
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, reason: 'missing_token' })
    }

    const ticket = await findTicket(token)
    if (!ticket) return res.status(404).json({ ok: false, reason: 'not_found' })
    if (ticket.status !== 'approved') {
      return res.status(409).json({ ok: false, reason: 'not_approved', ticket })
    }

    if (mode === 'reset') {
      const reseted = await reset(ticket.id)
      return res.status(200).json({ ok: true, ticket: reseted })
    }

    if (mode === 'lookup') {
      return res.status(200).json({ ok: true, ticket })
    }

    const remaining = ticket.ticket_count - ticket.checked_in_count
    if (remaining <= 0) {
      return res.status(409).json({ ok: false, reason: 'already_used', ticket })
    }

    const add = Math.max(1, Math.min(Number(count) || remaining, remaining))
    const updated = await bumpCheckin(ticket.id, ticket.checked_in_count, add, ticket.ticket_count)
    if (!updated) {
      return res.status(409).json({ ok: false, reason: 'concurrent_update', ticket })
    }

    return res.status(200).json({
      ok:        true,
      ticket:    updated,
      admitted:  add,
      remaining: updated.ticket_count - updated.checked_in_count,
    })
  } catch (e) {
    console.error('checkin error:', e)
    return res.status(500).json({ ok: false, reason: 'server_error', error: String(e?.message || e) })
  }
}
