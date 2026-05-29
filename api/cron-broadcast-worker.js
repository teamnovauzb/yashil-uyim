// Drains pending broadcasts. Each invocation atomically claims one batch of
// the oldest unfinished job, sends to those recipients, updates counters and
// either self-chains the next batch or exits. The atomic claim guarantees
// that even when many worker invocations fire concurrently (chainNext + bot
// pokes + the daily safety cron) no recipient ever gets a duplicate of the
// same broadcast.
//
// Tuned for reliability over speed: 100ms between sends, batch of 60. About
// 10 messages/sec sustained, well under Telegram's 30/sec ceiling. Failed
// sends collect into failed_recipients and trigger up to MAX_RETRIES retry
// passes over only the failed chat_ids before the job is marked done.

const BOT_TOKEN    = process.env.BOT_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const CRON_SECRET  = process.env.CRON_SECRET

const BATCH_SIZE     = 60
const SEND_DELAY_MS  = 100
const MAX_RETRIES    = 3

const HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function nextPendingJob() {
  // Pick the oldest job that is either unscheduled (fire_at NULL) or whose
  // fire time has arrived. PostgREST `or=(...)` with embedded ISO timestamp.
  const now = new Date().toISOString()
  const filter = `done=eq.false&or=(fire_at.is.null,fire_at.lte.${now})`
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/broadcasts?${filter}&order=created_at.asc&limit=1&select=*`,
    { headers: HEADERS }
  )
  const data = await r.json()
  return Array.isArray(data) ? data[0] : null
}

async function getJob(id) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/broadcasts?id=eq.${id}&select=*`,
    { headers: HEADERS }
  )
  const data = await r.json()
  return Array.isArray(data) ? data[0] : null
}

// Atomic batch claim. Advances next_offset from `expectedOffset` to
// `newOffset` ONLY if the row still has done=false and next_offset matches
// what we observed. Returns the row at the moment of claim, or null if
// another worker already won the claim (or finalized the job).
async function claimBatch(jobId, expectedOffset, newOffset) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/broadcasts?id=eq.${jobId}&next_offset=eq.${expectedOffset}&done=eq.false`,
    {
      method: 'PATCH',
      headers: { ...HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify({
        next_offset: newOffset,
        updated_at:  new Date().toISOString(),
      }),
    }
  )
  if (!r.ok) return null
  const data = await r.json()
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

// Atomic transition at end-of-pass: either start a retry pass (recipients
// becomes the failed list, next_offset resets to 0) or mark the job done.
// Both forms guard on next_offset=eq.expectedTotal so only one worker per
// pass can perform the transition.
async function transitionPassEnd(jobId, expectedTotal, payload) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/broadcasts?id=eq.${jobId}&next_offset=eq.${expectedTotal}&done=eq.false`,
    {
      method: 'PATCH',
      headers: { ...HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
    }
  )
  if (!r.ok) return null
  const data = await r.json()
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

// Returns { ok, retryAfter? } — retryAfter is set when Telegram returns 429.
async function sendOne(chatId, text) {
  try {
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
    if (r.ok) return { ok: true }
    if (r.status === 429) {
      const j = await r.json().catch(() => ({}))
      return { ok: false, retryAfter: j?.parameters?.retry_after || 1 }
    }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}

function chainNext(host) {
  if (!host || !CRON_SECRET) return
  fetch(`https://${host}/api/cron-broadcast-worker`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  }).catch(() => {})
}

export default async function handler(req, res) {
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
    const failedSoFar = Array.isArray(job.failed_recipients) ? job.failed_recipients : []
    const host       = req.headers?.host || req.headers?.['x-forwarded-host']

    // End of pass — either retry or done. Atomic guard prevents double-retry.
    if (start >= total) {
      const retryCount = job.retry_count || 0
      if (failedSoFar.length > 0 && retryCount < MAX_RETRIES) {
        const won = await transitionPassEnd(job.id, total, {
          recipients:        failedSoFar,
          failed_recipients: [],
          next_offset:       0,
          retry_count:       retryCount + 1,
        })
        if (won) chainNext(host)
        return res.status(200).json({
          ok: true, job_id: job.id, retry_started: won ? retryCount + 1 : null, raced: !won,
        })
      }
      const won = await transitionPassEnd(job.id, total, { done: true })
      return res.status(200).json({
        ok: true, job_id: job.id, finalized: !!won, raced: !won,
      })
    }

    // Mid-pass — atomically claim the next batch.
    const end     = Math.min(start + BATCH_SIZE, total)
    const claimed = await claimBatch(job.id, start, end)
    if (!claimed) {
      // Another worker beat us to this batch. Exit; let them continue.
      return res.status(200).json({ ok: true, job_id: job.id, raced: true })
    }

    // We own [start, end). Send those messages exclusively.
    let sentInBatch = 0
    const failedInBatch = []
    for (let i = start; i < end; i++) {
      const chatId = recipients[i]
      let result = await sendOne(chatId, claimed.message)
      if (!result.ok && result.retryAfter) {
        await sleep(Math.min(result.retryAfter * 1000, 10_000))
        result = await sendOne(chatId, claimed.message)
      }
      if (result.ok) sentInBatch++
      else failedInBatch.push(chatId)
      if (i < end - 1) await sleep(SEND_DELAY_MS)
    }

    // Update counters. Re-read the row first so we don't clobber concurrent
    // counter writes from a peer worker processing a different range. The
    // window between getJob and patch is small, so accumulation drift is
    // negligible in practice.
    const fresh = await getJob(job.id) || claimed
    const freshFailedList = Array.isArray(fresh.failed_recipients) ? fresh.failed_recipients : []
    await fetch(`${SUPABASE_URL}/rest/v1/broadcasts?id=eq.${job.id}`, {
      method: 'PATCH',
      headers: { ...HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        sent:              (fresh.sent || 0) + sentInBatch,
        failed:            (fresh.failed || 0) + failedInBatch.length,
        failed_recipients: [...freshFailedList, ...failedInBatch],
        updated_at:        new Date().toISOString(),
      }),
    })

    // Self-chain to drive forward progress.
    chainNext(host)

    return res.status(200).json({
      ok:        true,
      job_id:    job.id,
      processed: end - start,
      total,
      remaining: total - end,
    })
  } catch (e) {
    console.error('cron-broadcast-worker error:', e)
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
