import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import QRCode from 'qrcode'
import { safePath } from './storage.js'
import { check } from './db.js'

export const escapeHtml = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
export async function enqueue(db, key, chatId, kind, payload, jobId = null) {
  await db.query(`INSERT INTO deliveries(dedupe_key,chat_id,kind,payload,job_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedupe_key) DO NOTHING`, [key,String(chatId),kind,JSON.stringify(payload),jobId])
}
export async function notifyAdmins(db, key, kind, payload, superOnly = false) {
  const { rows } = await db.query(`SELECT telegram_id FROM admins ${superOnly ? 'WHERE is_super=true' : ''}`)
  for (const row of rows) await enqueue(db, `${key}:${row.telegram_id}`,row.telegram_id,kind,payload)
}
export function festivalInstant(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) return null
  const instant = new Date(`${date.slice(0,10)}T${time}:00+05:00`)
  return Number.isNaN(instant.getTime()) ? null : instant
}
export async function scheduleReminder(db, program) {
  await db.query('DELETE FROM broadcasts WHERE program_id=$1 AND expanded_at IS NULL', [program.id])
  const { rows } = await db.query("SELECT value FROM settings WHERE key='festival_date'")
  const instant = festivalInstant(rows[0]?.value, program.start_time?.slice(0,5))
  if (!instant || instant.getTime()-300000 <= Date.now()) return
  const message = `🔔 Tadbir 5 daqiqada boshlanadi!\n\n📋 ${escapeHtml(program.title)}\n${escapeHtml(program.speaker || '')}\n🕐 ${escapeHtml(program.start_time)}`
  await db.query(`INSERT INTO broadcasts(message,fire_at,program_id,audience) VALUES($1,$2,$3,'checked_in')`,[message,new Date(instant.getTime()-300000),program.id])
}
export async function expandBroadcast(db) {
  return db.transaction(async client => {
    const { rows } = await client.query(`SELECT * FROM broadcasts WHERE expanded_at IS NULL AND done=false AND (fire_at IS NULL OR fire_at<=now()) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`)
    const job = rows[0]; if (!job) return false
    let recipients = job.recipients || []
    if (job.audience === 'checked_in') {
      recipients = (await client.query(`SELECT DISTINCT t.chat_id FROM tickets t WHERE t.chat_id IS NOT NULL AND EXISTS(SELECT 1 FROM ticket_seats s WHERE s.ticket_id=t.id AND s.checked_in_at IS NOT NULL)`)).rows.map(x=>String(x.chat_id))
    }
    // Legacy imports resume from their persisted offset, rather than re-send past recipients.
    for (const chatId of recipients.slice(job.next_offset || 0)) await enqueue(client, `broadcast:${job.id}:${chatId}`,chatId,'message',{text:job.message},job.id)
    await client.query('UPDATE broadcasts SET expanded_at=now(),recipients=$2,done=$3 WHERE id=$1',[job.id,recipients,recipients.length===0])
    return true
  })
}
export function telegramClient(config) {
  return async (method, payload) => {
    const isForm = payload instanceof FormData
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/${method}`, {
      method:'POST', headers:isForm ? {} : {'Content-Type':'application/json'}, body:isForm ? payload : JSON.stringify(payload), signal:AbortSignal.timeout(15000),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) {
      const error = new Error(`Telegram ${result.error_code || response.status}`)
      error.retryAfter = Number(result.parameters?.retry_after) || null
      error.permanent = [400,403].includes(result.error_code)
      throw error
    }
    return result.result
  }
}

export async function processDelivery(db, config, telegram) {
  await db.query(`UPDATE deliveries SET status='failed',last_error='Lease expired after final attempt' WHERE status='sending' AND attempts>=5 AND leased_until<now()`)
  await db.query(`UPDATE broadcasts b SET done=true,sent=(SELECT count(*) FROM deliveries d WHERE d.job_id=b.id AND d.status='sent'),
    failed=(SELECT count(*) FROM deliveries d WHERE d.job_id=b.id AND d.status='failed') WHERE b.expanded_at IS NOT NULL AND NOT b.done
    AND NOT EXISTS(SELECT 1 FROM deliveries d WHERE d.job_id=b.id AND d.status IN ('pending','sending'))`)
  const lease = randomUUID()
  const row = await db.transaction(async client => {
    const { rows } = await client.query(`SELECT * FROM deliveries WHERE
      ((status='pending' AND available_at<=now()) OR (status='sending' AND leased_until<now())) AND attempts<5
      ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`)
    if (!rows[0]) return null
    return (await client.query(`UPDATE deliveries SET status='sending',attempts=attempts+1,leased_until=now()+interval '2 minutes',lease_token=$2 WHERE id=$1 RETURNING *`,[rows[0].id,lease])).rows[0]
  })
  if (!row) return false
  try {
    const payload = row.payload
    if (row.kind === 'ticket') {
      const { rows } = await db.query('SELECT * FROM tickets WHERE id=$1',[payload.ticket_id])
      const ticket = rows[0]
      if (ticket && ticket.status==='approved') {
        const seats = (await db.query('SELECT * FROM ticket_seats WHERE ticket_id=$1 ORDER BY seat_index',[ticket.id])).rows
        // Each seat is its own durable delivery; retries never restart the entire ticket.
        for (const seat of seats) await enqueue(db, `ticket-qr:${ticket.id}:${seat.seat_index}`,row.chat_id,'qr',{token:seat.qr_token,caption:`🎟 Yashil Uyim · #${ticket.ticket_number} · QR ${seat.seat_index}/${ticket.ticket_count}`})
      }
    } else if (row.kind==='qr') {
      const form = new FormData(); form.set('chat_id',row.chat_id); form.set('caption',payload.caption)
      form.set('photo',new Blob([await QRCode.toBuffer(payload.token,{width:600})],{type:'image/png'}),'ticket.png')
      await telegram('sendPhoto',form)
    } else if (row.kind==='receipt') {
      const { rows } = await db.query('SELECT * FROM tickets WHERE id=$1',[payload.ticket_id])
      const ticket = rows[0]
      if (ticket?.receipt_url?.startsWith('file:receipts/')) {
        const form = new FormData(); form.set('chat_id',row.chat_id)
        form.set('photo',new Blob([await readFile(safePath(config.uploadDir,'receipts',ticket.receipt_url.slice(14)))],{type:'image/jpeg'}),'receipt.jpg')
        form.set('caption',`📋 Chipta #${ticket.ticket_number}\nIsm: ${ticket.full_name}\nTelefon: ${ticket.phone}\nChipta soni: ${ticket.ticket_count}`)
        form.set('reply_markup',JSON.stringify({inline_keyboard:[[
          {text:'✅ Tasdiqlash',callback_data:`allow:${ticket.id}`},{text:'❌ Rad etish',callback_data:`fake:${ticket.id}`},
        ]]}))
        await telegram('sendPhoto',form)
      }
    } else {
      check(row.kind==='message','Unknown delivery kind')
      await telegram('sendMessage',{chat_id:row.chat_id,text:payload.text,parse_mode:'HTML',...(payload.reply_markup?{reply_markup:payload.reply_markup}:{})})
    }
    await db.query("UPDATE deliveries SET status='sent',sent_at=now(),leased_until=NULL WHERE id=$1 AND lease_token=$2",[row.id,lease])
  } catch (error) {
    const terminal = error.permanent || row.attempts>=5
    const delay = Math.max(error.retryAfter || 0, Math.min(3600, 2**row.attempts*5))
    await db.query(`UPDATE deliveries SET status=$3,available_at=now()+($4 * interval '1 second'),last_error=$5,leased_until=NULL WHERE id=$1 AND lease_token=$2`,
      [row.id,lease,terminal?'failed':'pending',delay,error.permanent?'Telegram rejected delivery':'Delivery failed; retry scheduled'])
  }
  return true
}
