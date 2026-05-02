// Daily cron — wipes QR artifacts 3 days after festival_date passes.
// Wired in vercel.json under "crons". Vercel automatically sets the
// `Authorization: Bearer ${CRON_SECRET}` header on cron invocations,
// which we verify so manual hits without the secret are rejected.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const CRON_SECRET  = process.env.CRON_SECRET

const CLEANUP_DELAY_DAYS = 3

const HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
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

async function listStorageObjects(prefix) {
  // Lists up to 1000 objects under media/<prefix>
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/media`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  })
  if (!r.ok) return []
  const data = await r.json()
  return Array.isArray(data) ? data : []
}

async function deleteStorageObjects(paths) {
  if (!paths.length) return { ok: true, removed: 0 }
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/media`, {
    method: 'DELETE',
    headers: HEADERS,
    body: JSON.stringify({ prefixes: paths }),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return { ok: false, error: `${r.status} ${text}` }
  }
  return { ok: true, removed: paths.length }
}

async function deleteAllSeats() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ticket_seats?ticket_id=gte.0`, {
    method: 'DELETE',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
  })
  return r.ok
}

async function clearTicketQrColumns() {
  // Wipe legacy single-QR fields too so old approved tickets stop pointing at deleted images.
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tickets?status=eq.approved`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ qr_token: null, qr_url: null }),
  })
  return r.ok
}

export default async function handler(req, res) {
  // Reject anything that's not the Vercel cron (or a manual call with the same secret).
  const auth = req.headers?.authorization || req.headers?.Authorization
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ ok: false, reason: 'unauthorized' })
  }

  try {
    const festDateRaw = await getSetting('festival_date', '')
    const festDate = festDateRaw ? new Date(festDateRaw) : null

    if (!festDate || isNaN(festDate)) {
      return res.status(200).json({ ok: true, skipped: 'festival_date not set or invalid' })
    }

    const cutoff = new Date(festDate.getTime() + CLEANUP_DELAY_DAYS * 24 * 60 * 60 * 1000)
    const now = new Date()

    if (now < cutoff) {
      return res.status(200).json({
        ok: true,
        skipped: 'before cutoff',
        cutoff: cutoff.toISOString(),
        now:    now.toISOString(),
      })
    }

    // Already cleaned? Bail quickly if there's nothing left.
    const objs = await listStorageObjects('qr/')
    const seatsCleared = await deleteAllSeats()
    const ticketsCleared = await clearTicketQrColumns()

    let storageResult = { ok: true, removed: 0 }
    if (objs.length) {
      const paths = objs.map(o => `qr/${o.name}`)
      storageResult = await deleteStorageObjects(paths)
    }

    return res.status(200).json({
      ok:             true,
      cutoff:         cutoff.toISOString(),
      seatsCleared,
      ticketsCleared,
      storage:        storageResult,
      qrFilesFound:   objs.length,
    })
  } catch (e) {
    console.error('cron-cleanup-qrs error:', e)
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
