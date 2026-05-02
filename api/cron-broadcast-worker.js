// Drains pending broadcasts. Picks the oldest unfinished job, sends a batch of
// messages from its `recipients` list starting at `next_offset`, then updates
// counters. Designed so each invocation finishes well under Vercel's 10s
// timeout. Cron runs this every minute; a fresh /api/broadcast also kicks it
// once on creation so the first batch goes out immediately.

const BOT_TOKEN    = process.env.BOT_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const CRON_SECRET  = process.env.CRON_SECRET

const BATCH_SIZE    = 100
const SEND_DELAY_MS = 40

const HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function nextPendingJob() {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/broadcasts?done=eq.false&order=created_at.asc&limit=1&select=*`,
    { headers: HEADERS }
  )
  const data = await r.json()
  return Array.isArray(data) ? data[0] : null
}

async function sendOne(chatId, text) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  return r.ok
}

async function patchJob(id, payload) {
  await fetch(`${SUPABASE_URL}/rest/v1/broadcasts?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
  })
}

function chainNext(host) {
  if (!host || !CRON_SECRET) return
  // Fire-and-forget self-call so the next batch starts right after this one
  // returns, instead of waiting for the cron tick. We don't await.
  fetch(`https://${host}/api/cron-broadcast-worker`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  }).catch(() => {})
}

export default async function handler(req, res) {
  // Vercel cron and our own self-kicks both pass the bearer token.
  const auth = req.headers?.authorization || req.headers?.Authorization
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ ok: false, reason: 'unauthorized' })
  }

  try {
    const job = await nextPendingJob()
    if (!job) return res.status(200).json({ ok: true, idle: true })

    const recipients = Array.isArray(job.recipients) ? job.recipients : []
    const total      = recipients.length
    const start      = job.next_offset || 0
    const end        = Math.min(start + BATCH_SIZE, total)

    if (start >= total) {
      // Already past the end — just mark done.
      await patchJob(job.id, { done: true })
      return res.status(200).json({ ok: true, job_id: job.id, finalized: true })
    }

    let sentInBatch = 0
    let failedInBatch = 0
    for (let i = start; i < end; i++) {
      const ok = await sendOne(recipients[i], job.message)
      if (ok) sentInBatch++
      else failedInBatch++
      if (i < end - 1) await sleep(SEND_DELAY_MS)
    }

    const newOffset = end
    const isDone    = newOffset >= total

    await patchJob(job.id, {
      next_offset: newOffset,
      sent:        (job.sent || 0) + sentInBatch,
      failed:      (job.failed || 0) + failedInBatch,
      done:        isDone,
    })

    // If more work remains, start the next batch right away.
    if (!isDone) {
      chainNext(req.headers?.host || req.headers?.['x-forwarded-host'])
    }

    return res.status(200).json({
      ok:        true,
      job_id:    job.id,
      processed: end - start,
      total,
      remaining: total - newOffset,
      done:      isDone,
    })
  } catch (e) {
    console.error('cron-broadcast-worker error:', e)
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
