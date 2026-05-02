const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
}

// --- New per-seat lookups (preferred) ---

async function findSeat(token) {
  // Embed parent ticket via FK relationship.
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/ticket_seats?qr_token=eq.${encodeURIComponent(token)}&select=*,tickets(*)`,
    { headers: HEADERS }
  )
  const data = await r.json()
  return Array.isArray(data) ? data[0] : null
}

async function seatsForTicket(ticketId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/ticket_seats?ticket_id=eq.${ticketId}&select=seat_index,checked_in_at&order=seat_index.asc`,
    { headers: HEADERS }
  )
  const data = await r.json()
  return Array.isArray(data) ? data : []
}

// Atomic single-use claim: only succeeds while checked_in_at IS NULL.
async function claimSeat(token) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/ticket_seats?qr_token=eq.${encodeURIComponent(token)}&checked_in_at=is.null`,
    {
      method: 'PATCH',
      headers: { ...HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify({ checked_in_at: new Date().toISOString() }),
    }
  )
  const data = await r.json()
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

async function releaseSeats(ticketId) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/ticket_seats?ticket_id=eq.${ticketId}`,
    {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ checked_in_at: null }),
    }
  )
}

async function patchTicketCount(id, count) {
  await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${id}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({
      checked_in_count: count,
      last_checkin_at:  count > 0 ? new Date().toISOString() : null,
    }),
  })
}

// --- Legacy: single-QR fallback for tickets approved before per-seat rollout ---

async function findLegacyTicket(token) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/tickets?qr_token=eq.${encodeURIComponent(token)}&select=*`,
    { headers: HEADERS }
  )
  const data = await r.json()
  return Array.isArray(data) ? data[0] : null
}

async function legacyBumpCheckin(id, currentCount, addCount) {
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

async function legacyReset(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify({ checked_in_count: 0, last_checkin_at: null }),
  })
  const data = await r.json()
  return Array.isArray(data) ? data[0] : null
}

// --- Handler ---

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  try {
    const { token, count, mode } = req.body || {}
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, reason: 'missing_token' })
    }

    // 1) Try the new per-seat path
    const seat = await findSeat(token)
    if (seat && seat.tickets) {
      const ticket = seat.tickets
      if (ticket.status !== 'approved') {
        return res.status(409).json({ ok: false, reason: 'not_approved', ticket, seat })
      }

      if (mode === 'reset') {
        await releaseSeats(ticket.id)
        await patchTicketCount(ticket.id, 0)
        const refreshed = await findSeat(token)
        return res.status(200).json({
          ok: true,
          ticket: refreshed?.tickets || ticket,
          seat:   refreshed || seat,
        })
      }

      if (mode === 'lookup') {
        return res.status(200).json({ ok: true, ticket, seat })
      }

      // Default: claim this single seat
      if (seat.checked_in_at) {
        return res.status(409).json({ ok: false, reason: 'already_used', ticket, seat })
      }

      const claimed = await claimSeat(token)
      if (!claimed) {
        // Lost the race
        const refreshed = await findSeat(token)
        return res.status(409).json({ ok: false, reason: 'already_used', ticket, seat: refreshed || seat })
      }

      // Update denormalized count on tickets row (best-effort, non-critical)
      const allSeats = await seatsForTicket(ticket.id)
      const used = allSeats.filter(s => s.checked_in_at).length
      await patchTicketCount(ticket.id, used).catch(() => {})

      return res.status(200).json({
        ok:        true,
        ticket:    { ...ticket, checked_in_count: used },
        seat:      claimed,
        admitted:  1,
        remaining: ticket.ticket_count - used,
      })
    }

    // 2) Legacy fallback — pre-rollout tickets with one shared QR
    const ticket = await findLegacyTicket(token)
    if (!ticket) return res.status(404).json({ ok: false, reason: 'not_found' })
    if (ticket.status !== 'approved') {
      return res.status(409).json({ ok: false, reason: 'not_approved', ticket })
    }

    if (mode === 'reset') {
      const reseted = await legacyReset(ticket.id)
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
    const updated = await legacyBumpCheckin(ticket.id, ticket.checked_in_count, add)
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
