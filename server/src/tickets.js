import { randomBytes } from 'node:crypto'
import { audit, check, id, text } from './db.js'
import { enqueue, notifyAdmins, escapeHtml } from './jobs.js'

export async function checkout(db, user, fields, file, storage) {
  const name=text(fields.full_name,'name',200), phone=text(fields.phone,'phone',30)
  check(/^\+?[\d ()-]{7,25}$/.test(phone),'Invalid phone')
  const count=Number(fields.ticket_count)
  check(Number.isInteger(count)&&count>=1&&count<=20,'Choose 1–20 tickets')
  check(typeof fields.request_key==='string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(fields.request_key),'Invalid checkout request')
  check(file,'Receipt image required')
  const existing=(await db.query('SELECT * FROM tickets WHERE request_key=$1',[fields.request_key])).rows[0]
  if(existing) { check(String(existing.chat_id)===String(user.telegram_id),'Invalid checkout request',409); return storage.decorate(existing) }
  const receipt=await storage.receipt(file)
  try {
    return await db.transaction(async client=>{
      const {rows}=await client.query(`INSERT INTO tickets(full_name,phone,ticket_count,chat_id,receipt_url,request_key)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(request_key) DO NOTHING RETURNING *`,[name,phone,count,user.telegram_id,receipt.stored,fields.request_key])
      if(!rows[0]) {
        const row=(await client.query('SELECT * FROM tickets WHERE request_key=$1',[fields.request_key])).rows[0]
        check(String(row.chat_id)===String(user.telegram_id),'Invalid checkout request',409)
        await storage.remove('receipts',receipt.key)
        return storage.decorate(row)
      }
      const ticket=rows[0]
      await notifyAdmins(client,`receipt:${ticket.id}`,'receipt',{ticket_id:ticket.id})
      await audit(client,user.telegram_id,'checkout','tickets',ticket.id)
      return storage.decorate(ticket)
    })
  } catch(error) { await storage.remove('receipts',receipt.key); throw error }
}

export async function ticketAction(db, actor, ticketId, action) {
  check(actor?.is_admin,'Admin access required',403); id(ticketId)
  check(['allow','fake'].includes(action),'Invalid ticket action')
  const run=async client=>{
    const ticket=(await client.query('SELECT * FROM tickets WHERE id=$1 FOR UPDATE',[ticketId])).rows[0]
    check(ticket,'Ticket not found',404)
    if(ticket.status==='approved'&&action==='allow') return ticket // Preserve all issued QRs and check-ins.
    if(ticket.status==='fake'&&action==='fake') return ticket
    check(ticket.status==='pending','Ticket is already processed',409)
    if(action==='allow') {
      check(ticket.receipt_url,'Receipt required',409)
      check(Number.isInteger(ticket.ticket_count)&&ticket.ticket_count>=1&&ticket.ticket_count<=20,'Ticket quantity needs administrator review',409)
      for(let i=1;i<=ticket.ticket_count;i++) {
        const token=randomBytes(16).toString('base64url')
        await client.query('INSERT INTO ticket_seats(ticket_id,seat_index,qr_token,qr_url) VALUES($1,$2,$3,$4)',[ticket.id,i,token,`file:media/qr/live_${token}.png`])
      }
      const seat=(await client.query('SELECT * FROM ticket_seats WHERE ticket_id=$1 ORDER BY seat_index LIMIT 1',[ticket.id])).rows[0]
      await client.query("UPDATE tickets SET status='approved',qr_token=$2,qr_url=$3 WHERE id=$1",[ticket.id,seat.qr_token,seat.qr_url])
      if(ticket.chat_id) await enqueue(client,`approved:${ticket.id}`,ticket.chat_id,'ticket',{ticket_id:ticket.id})
    } else {
      await client.query("UPDATE tickets SET status='fake' WHERE id=$1",[ticket.id])
      if(ticket.chat_id) await enqueue(client,`rejected:${ticket.id}`,ticket.chat_id,'message',{text:`❌ Chipta #${ticket.ticket_number}: chek tasdiqlanmadi. Profilingizdan holatni tekshiring.`})
    }
    await audit(client,actor.telegram_id,action,'tickets',ticket.id)
    return (await client.query('SELECT * FROM tickets WHERE id=$1',[ticket.id])).rows[0]
  }
  return db.transaction ? db.transaction(run) : run(db)
}

export async function checkin(db, actor, { token, mode, count }) {
  check(actor?.is_admin,'Admin access required',403)
  check(typeof token==='string'&&/^[\w-]{10,128}$/.test(token),'Invalid QR code')
  check(!mode || ['lookup','reset'].includes(mode),'Invalid mode')
  if(mode==='reset') check(actor.is_super,'Super admin access required',403)
  return db.transaction(async client=>{
    let seat=(await client.query('SELECT * FROM ticket_seats WHERE qr_token=$1',[token])).rows[0]
    const ticket=(await client.query(`SELECT * FROM tickets WHERE ${seat?'id':'qr_token'}=$1 FOR UPDATE`,[seat?seat.ticket_id:token])).rows[0]
    check(ticket,'Ticket not found',404)
    check(ticket.status==='approved','Ticket is not approved',409)
    if(seat)seat=(await client.query('SELECT * FROM ticket_seats WHERE qr_token=$1',[token])).rows[0]
    if(mode==='lookup') return {ok:true,ticket,seat}
    if(mode==='reset') {
      await client.query('UPDATE ticket_seats SET checked_in_at=NULL WHERE ticket_id=$1',[ticket.id])
      await client.query('UPDATE tickets SET checked_in_count=0,last_checkin_at=NULL WHERE id=$1',[ticket.id])
      await audit(client,actor.telegram_id,'reset','tickets',ticket.id)
      return {ok:true,ticket:{...ticket,checked_in_count:0},seat:seat?{...seat,checked_in_at:null}:null}
    }
    let admitted, claimed=seat
    if(seat) {
      claimed=(await client.query('UPDATE ticket_seats SET checked_in_at=now() WHERE qr_token=$1 AND checked_in_at IS NULL RETURNING *',[token])).rows[0]
      if(!claimed) return {ok:false,reason:'already_used',ticket,seat:(await client.query('SELECT * FROM ticket_seats WHERE qr_token=$1',[token])).rows[0]}
      admitted=1
      const used=Number((await client.query('SELECT count(*) AS total FROM ticket_seats WHERE ticket_id=$1 AND checked_in_at IS NOT NULL',[ticket.id])).rows[0].total)
      ticket.checked_in_count=used
    } else {
      const remaining=ticket.ticket_count-ticket.checked_in_count
      if(remaining<=0) return {ok:false,reason:'already_used',ticket}
      admitted=Math.min(Number(count)||remaining,remaining)
      check(Number.isInteger(admitted)&&admitted>=1,'Invalid entry count')
      ticket.checked_in_count+=admitted
    }
    await client.query('UPDATE tickets SET checked_in_count=$2,last_checkin_at=now() WHERE id=$1',[ticket.id,ticket.checked_in_count])
    await audit(client,actor.telegram_id,'checkin','tickets',ticket.id,{admitted,seat:seat?.seat_index})
    return {ok:true,ticket,seat:claimed,admitted,remaining:ticket.ticket_count-ticket.checked_in_count}
  })
}

export async function replyToSuggestion(db,actor,body) {
  check(actor?.is_admin,'Admin access required',403)
  const suggestionId=id(body.id),reply=text(body.reply,'reply',3000)
  return db.transaction(async client=>{
    const row=(await client.query('UPDATE suggestions SET reply=$2,replied_at=now(),replied_by=$3 WHERE id=$1 RETURNING *',[suggestionId,reply,actor.telegram_id])).rows[0]
    check(row,'Suggestion not found',404)
    if(row.chat_id) await enqueue(client,`reply:${row.id}:${Date.now()}`,row.chat_id,'message',{text:`✉️ Adminning javobi\n\n${escapeHtml(reply)}`})
    await audit(client,actor.telegram_id,'reply','suggestions',row.id)
    return {ok:true}
  })
}
