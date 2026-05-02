// Drains pending broadcasts. Each invocation processes one batch from the
// oldest unfinished job, then either self-chains the next batch or exits and
// lets the per-minute cron pick it up later. Failed sends are accumulated in
// failed_recipients and retried (up to MAX_RETRIES passes) before the job
// is marked done — so every user actually gets the message.
//
// Tuned for reliability over speed: 100ms between sends, batch of 60. About
// 10 messages/sec sustained, well under Telegram's 30/sec ceiling.

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
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/broadcasts?done=eq.false&order=created_at.asc&limit=1&select=*`,
    { headers: HEADERS }
  )
  const data = await r.json()
  return Array.isArray(data) ? data[0] : null
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

async function patchJob(id, payload) {
  await fetch(`${SUPABASE_URL}/rest/v1/broadcasts?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
  })
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
    const end        = Math.min(start + BATCH_SIZE, total)
    const failedSoFar = Array.isArray(job.failed_recipients) ? job.failed_recipients : []

    // Already past the end of the current pass — finalize or queue retry.
    if (start >= total) {
      const retryCount = job.retry_count || 0
      if (failedSoFar.length > 0 && retryCount < MAX_RETRIES) {
        // Start a retry pass with just the failed chat_ids.
        await patchJob(job.id, {
          recipients:        failedSoFar,
          failed_recipients: [],
          next_offset:       0,
          retry_count:       retryCount + 1,
        })
        chainNext(req.headers?.host || req.headers?.['x-forwarded-host'])
        return res.status(200).json({
          ok: true, job_id: job.id, retry_started: retryCount + 1, retry_size: failedSoFar.length,
        })
      }
      await patchJob(job.id, { done: true })
      return res.status(200).json({
        ok: true, job_id: job.id, finalized: true, undelivered: failedSoFar.length,
      })
    }

    let sentInBatch = 0
    let failedInBatch = []
    for (let i = start; i < end; i++) {
      const chatId = recipients[i]
      let result = await sendOne(chatId, job.message)

      // Honor Telegram's 429 retry_after — sleep then try once more.
      if (!result.ok && result.retryAfter) {
        await sleep(Math.min(result.retryAfter * 1000, 10_000))
        result = await sendOne(chatId, job.message)
      }

      if (result.ok) sentInBatch++
      else failedInBatch.push(chatId)

      if (i < end - 1) await sleep(SEND_DELAY_MS)
    }

    const newOffset    = end
    const passComplete = newOffset >= total
    const allFailed    = [...failedSoFar, ...failedInBatch]

    let isDone   = false
    let didRetry = false

    if (passComplete) {
      const retryCount = job.retry_count || 0
      if (allFailed.length > 0 && retryCount < MAX_RETRIES) {
        // Kick off a retry pass: shrink recipients to just the failures.
        await patchJob(job.id, {
          sent:              (job.sent || 0) + sentInBatch,
          failed:            (job.failed || 0) + failedInBatch.length,
          recipients:        allFailed,
          failed_recipients: [],
          next_offset:       0,
          retry_count:       retryCount + 1,
        })
        didRetry = true
      } else {
        // No retry needed/left — mark done.
        await patchJob(job.id, {
          next_offset:       newOffset,
          sent:              (job.sent || 0) + sentInBatch,
          failed:            (job.failed || 0) + failedInBatch.length,
          failed_recipients: allFailed,
          done:              true,
        })
        isDone = true
      }
    } else {
      // More to do in this pass.
      await patchJob(job.id, {
        next_offset:       newOffset,
        sent:              (job.sent || 0) + sentInBatch,
        failed:            (job.failed || 0) + failedInBatch.length,
        failed_recipients: allFailed,
      })
    }

    if (!isDone) {
      chainNext(req.headers?.host || req.headers?.['x-forwarded-host'])
    }

    return res.status(200).json({
      ok:        true,
      job_id:    job.id,
      processed: end - start,
      total,
      remaining: total - newOffset,
      retried:   didRetry,
      done:      isDone,
    })
  } catch (e) {
    console.error('cron-broadcast-worker error:', e)
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
