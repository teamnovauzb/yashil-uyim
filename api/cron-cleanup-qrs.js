// Daily cron — wipes ALL ticket data (rows, QR images, receipts) 3 days after
// festival_date passes. Until that cutoff, the admin view keeps showing every
// purchaser, their QR and their receipt; once the cutoff hits, the slate is
// cleared so we don't keep customer phone numbers / receipts longer than needed.
//
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

async function listStorageObjects(bucket, prefix) {
  // Lists up to 1000 objects in the bucket under <prefix>.
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  })
  if (!r.ok) return []
  const data = await r.json()
  return Array.isArray(data) ? data : []
}

async function deleteStorageObjects(bucket, paths) {
  if (!paths.length) return { ok: true, removed: 0 }
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
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

// Drains a bucket of every object under `prefix` in batches of 1000 until empty.
async function emptyBucketPrefix(bucket, prefix) {
  let totalRemoved = 0
  for (let i = 0; i < 50; i++) { // safety cap: 50k objects max
    const objs = await listStorageObjects(bucket, prefix)
    if (!objs.length) break
    const paths = objs.map(o => `${prefix}${o.name}`)
    const r = await deleteStorageObjects(bucket, paths)
    if (!r.ok) return { ok: false, removed: totalRemoved, error: r.error }
    totalRemoved += r.removed
    if (objs.length < 1000) break
  }
  return { ok: true, removed: totalRemoved }
}

async function deleteAllTickets() {
  // Cascade FK on ticket_seats wipes seat rows automatically.
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=gte.0`, {
    method: 'DELETE',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
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

    // Past the cutoff — wipe everything.
    const ticketsCleared  = await deleteAllTickets()
    const qrStorage       = await emptyBucketPrefix('media',    'qr/')
    const receiptsStorage = await emptyBucketPrefix('receipts', '')

    return res.status(200).json({
      ok:             true,
      cutoff:         cutoff.toISOString(),
      ticketsCleared,
      qrStorage,
      receiptsStorage,
    })
  } catch (e) {
    console.error('cron-cleanup-qrs error:', e)
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
