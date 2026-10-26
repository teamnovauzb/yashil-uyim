import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHmac } from 'node:crypto'
import sharp from 'sharp'
import { harness, multipartPayload } from './helpers.js'
import { randomToken, validateTelegram } from '../src/auth.js'
import { ticketAction } from '../src/tickets.js'
import { festivalInstant, expandBroadcast, processDelivery, enqueue } from '../src/jobs.js'

let h,tokens,image
const bearer=user=>({authorization:`Bearer ${tokens[user].access_token}`})
const call=(url,payload,user=1)=>h.app.inject({method:'POST',url,payload,headers:bearer(user)})
before(async()=>{h=await harness();tokens=await h.seed();image=await sharp({create:{width:8,height:8,channels:3,background:'#ffffff'}}).png().toBuffer()})
after(async()=>h?.close())

test('health and public content work; customer and admin collections require verified identity',async()=>{
  assert.equal((await h.app.inject('/api/health')).statusCode,200)
  assert.equal((await h.app.inject({method:'POST',url:'/api/data/news',payload:{}})).statusCode,200)
  assert.equal((await h.app.inject({method:'POST',url:'/api/data/users',payload:{}})).statusCode,401)
  for(const url of ['/api/admin-action','/api/checkin','/api/broadcast'])assert.equal((await call(url,{tg_id:11,ticket:{id:1},action:'allow',token:'test_qr_token'})).statusCode,403)
  assert.equal((await h.app.inject({method:'POST',url:'/api/bot',payload:{update_id:1}})).statusCode,401)
})
test('guest content endpoint publishes only festival content and reflects database changes',async()=>{
  await h.db.query("INSERT INTO programs(title,start_time) VALUES('Public programme','12:00'); INSERT INTO news(title,content) VALUES('Public news','Published text'); INSERT INTO settings(key,value) VALUES('payment_card','private payment data'),('festival_date','2026-10-31T12:00:00')")
  const first=await h.app.inject('/api/public/content')
  assert.equal(first.statusCode,200,first.payload)
  assert.equal(first.json().version,1);assert.equal(first.json().programs[0].title,'Public programme')
  assert.equal(first.json().settings.festival_date,'2026-10-31T12:00:00')
  assert.equal(first.json().settings.payment_card,undefined)
  for(const key of ['users','tickets','admins','suggestions','receipts'])assert.equal(first.json()[key],undefined)
  assert.ok(!first.payload.includes('+998')&&!first.payload.includes('private payment data'))
  await h.db.query("UPDATE news SET title='Changed on VPS' WHERE title='Public news'")
  assert.equal((await h.app.inject('/api/public/content')).json().news[0].title,'Changed on VPS')
  assert.equal((await h.app.inject({method:'POST',url:'/api/public/content',payload:{title:'Unauthorized change'}})).statusCode,404)
  await h.db.query("DELETE FROM programs WHERE title='Public programme'; DELETE FROM news WHERE title='Changed on VPS'; DELETE FROM settings WHERE key IN ('payment_card','festival_date')")
})
test('forged IDs and filter injection cannot read or modify other users',async()=>{
  const other=await call('/api/data/users',{filters:[{column:'telegram_id',op:'eq',value:2}]})
  assert.deepEqual(other.json().data,[])
  assert.equal((await call('/api/data/users',{action:'upsert',values:{telegram_id:2,phone:'+998901234567'}})).statusCode,403)
  assert.equal((await call('/api/data/users',{action:'update',values:{is_tester:true},filters:[{column:'telegram_id',op:'eq',value:1}]})).statusCode,403)
  assert.equal((await call('/api/data/users',{filters:[{column:'telegram_id; DROP TABLE users',op:'eq',value:2}]})).statusCode,400)
  assert.equal((await call('/api/data/not_a_table',{})).statusCode,404)
})
test('public settings never expose an internal secret',async()=>{
  await h.db.query("INSERT INTO settings(key,value) VALUES('internal_secret','hidden'),('festival_address','Toshkent')")
  const result=await h.app.inject({method:'POST',url:'/api/data/settings',payload:{}})
  assert.deepEqual(result.json().data.map(x=>x.key),['festival_address'])
})
test('OTP requires both the requesting verifier and the Telegram-delivered code, and is single-use',async()=>{
  const verifier=randomToken(),started=await h.app.services.auth.start(verifier)
  assert.match(started.telegram_url,/\?start=login_/)
  const hook={update_id:100,message:{chat:{id:1,type:'private'},from:{id:1,first_name:'One'},text:`/start login_${started.challenge}`}}
  const headers={'x-telegram-bot-api-secret-token':h.config.webhookSecret}
  assert.equal((await h.app.inject({method:'POST',url:'/api/bot',headers,payload:hook})).statusCode,200)
  const code=h.calls.at(-1).payload.text.match(/\b\d{6}\b/)[0]
  assert.equal((await h.app.inject({method:'POST',url:'/api/bot',headers,payload:hook})).statusCode,200)
  const invalid=await h.app.inject({method:'POST',url:'/api/auth/verify',payload:{challenge:started.challenge,verifier:randomToken(),code}})
  assert.equal(invalid.statusCode,401)
  const result=await h.app.inject({method:'POST',url:'/api/auth/verify',payload:{challenge:started.challenge,verifier,code}})
  assert.equal(result.statusCode,200);assert.equal(result.json().refresh_token,undefined)
  assert.match(result.headers['set-cookie'],/HttpOnly/)
  assert.equal((await h.app.inject({method:'POST',url:'/api/auth/verify',payload:{challenge:started.challenge,verifier,code}})).statusCode,401)
})
test('wrong OTP attempts persist and lock out after five guesses',async()=>{
  const verifier=randomToken(),started=await h.app.services.auth.start(verifier)
  await h.app.services.auth.deliverCode(started.challenge,{id:2,first_name:'Two'})
  const code=h.calls.at(-1).payload.text.match(/\b\d{6}\b/)[0],wrong=code==='111111'?'222222':'111111'
  for(let i=0;i<5;i++)await assert.rejects(h.app.services.auth.verify({challenge:started.challenge,verifier,code:wrong}),/invalid/)
  assert.equal((await h.db.query('SELECT attempts FROM login_challenges WHERE id=$1',[started.challenge])).rows[0].attempts,5)
  await assert.rejects(h.app.services.auth.verify({challenge:started.challenge,verifier,code}),/invalid/)
})
test('refresh rotates tokens and old tokens cannot be reused; logout revokes access',async()=>{
  const session=await h.app.services.auth.issueSession(h.db,'2')
  const rotated=await h.app.services.auth.refresh(session.refresh_token)
  await assert.rejects(h.app.services.auth.refresh(session.refresh_token),/Sign in again/)
  assert.equal(await h.app.services.auth.userFor(session.access_token),null)
  assert.ok(await h.app.services.auth.userFor(rotated.access_token))
  await h.app.services.auth.logout(rotated.refresh_token)
  assert.equal(await h.app.services.auth.userFor(rotated.access_token),null)
})
test('cookie mutations require an allowed Origin; untrusted browser origins are rejected',async()=>{
  const cookie=`yu_refresh=${tokens[1].refresh_token}`
  assert.equal((await h.app.inject({method:'POST',url:'/api/auth/refresh',headers:{cookie},payload:{}})).statusCode,403)
  assert.equal((await h.app.inject({method:'POST',url:'/api/auth/refresh',headers:{cookie,origin:'https://attacker.invalid'},payload:{}})).statusCode,403)
})
test('Telegram initData validates its signature, age, and duplicate parameters, with cookie-free embedded sessions',async()=>{
  const params=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:1,first_name:'One'})})
  const key=createHmac('sha256','WebAppData').update(h.config.botToken).digest()
  const hash=createHmac('sha256',key).update([...params].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n')).digest('hex')
  params.set('hash',hash)
  assert.equal(validateTelegram(params.toString(),h.config.botToken).id,1)
  assert.throws(()=>validateTelegram(params.toString()+'&user=x',h.config.botToken),/Invalid/)
  assert.throws(()=>validateTelegram(params.toString(),h.config.botToken,Date.now()+600000),/expired/)
  assert.throws(()=>validateTelegram(params.toString().replace(hash,'0'.repeat(64)),h.config.botToken),/invalid/)
  const embedded=await h.app.inject({method:'POST',url:'/api/auth/telegram',payload:{init_data:params.toString(),client:'embedded'}})
  assert.equal(embedded.statusCode,200,embedded.payload)
  assert.equal(embedded.json().refresh_token.length,43)
  assert.equal(embedded.headers['set-cookie'],undefined)
})
let ticket
test('checkout rejects invalid receipts and creates one owned ticket on safe retries',async()=>{
  const fields={full_name:'Purchaser',phone:'+998901234567',ticket_count:2,request_key:randomUUID()}
  let form=await multipartPayload(fields)
  assert.equal((await h.app.inject({method:'POST',url:'/api/tickets/checkout',...form,headers:{...form.headers,...bearer(1)}})).statusCode,400)
  form=await multipartPayload(fields,image)
  const first=await h.app.inject({method:'POST',url:'/api/tickets/checkout',...form,headers:{...form.headers,...bearer(1)}})
  assert.equal(first.statusCode,200,first.payload);ticket=first.json().ticket
  assert.ok(ticket.ticket_number>=100000);assert.equal(String(ticket.chat_id),'1')
  const again=await h.app.inject({method:'POST',url:'/api/tickets/checkout',...form,headers:{...form.headers,...bearer(1)}})
  assert.equal(String(again.json().ticket.id),String(ticket.id))
  assert.equal((await call('/api/data/tickets',{filters:[{column:'id',op:'eq',value:ticket.id}]},2)).json().data.length,0)
  const over=await multipartPayload({...fields,ticket_count:999,request_key:randomUUID()},image)
  assert.equal((await h.app.inject({method:'POST',url:'/api/tickets/checkout',...over,headers:{...over.headers,...bearer(1)}})).statusCode,400)
})
test('private receipt links require an unexpired signature; traversal is rejected',async()=>{
  const url=new URL(ticket.receipt_url)
  assert.equal((await h.app.inject(url.pathname+url.search)).statusCode,200)
  assert.equal((await h.app.inject(url.pathname)).statusCode,403)
  assert.equal((await h.app.inject(url.pathname+url.search.replace(/expires=\d+/,'expires=1'))).statusCode,403)
  assert.throws(()=>h.app.services.storage.url('receipts','../secret'),/Invalid file/)
})
test('approval is atomic, repeated approval preserves QRs and scanned entries, and reset is super-admin-only',async()=>{
  const allowed=await call('/api/admin-action',{action:'allow',ticket:{id:ticket.id,ticket_count:999,chat_id:2}},10)
  assert.equal(allowed.statusCode,200,allowed.payload)
  const seats=(await h.db.query('SELECT * FROM ticket_seats WHERE ticket_id=$1 ORDER BY seat_index',[ticket.id])).rows
  assert.equal(seats.length,2)
  const scanned=await call('/api/checkin',{token:seats[0].qr_token},10)
  assert.equal(scanned.json().admitted,1)
  assert.equal((await call('/api/checkin',{token:seats[0].qr_token},10)).json().reason,'already_used')
  assert.equal((await call('/api/checkin',{token:seats[0].qr_token,mode:'reset'},10)).statusCode,403)
  await call('/api/admin-action',{action:'allow',ticket:{id:ticket.id}},10)
  const unchanged=(await h.db.query('SELECT * FROM ticket_seats WHERE ticket_id=$1 ORDER BY seat_index',[ticket.id])).rows
  assert.equal(unchanged[0].qr_token,seats[0].qr_token);assert.ok(unchanged[0].checked_in_at)
  const reset=await call('/api/checkin',{token:seats[0].qr_token,mode:'reset'},11)
  assert.equal(reset.json().ticket.checked_in_count,0)
})
test('database failure during seat creation rolls approval back completely',async()=>{
  const row=(await h.db.query("INSERT INTO tickets(full_name,phone,ticket_count,chat_id,receipt_url) VALUES('Failure','123456789',2,1,'file:receipts/test.jpg') RETURNING *")).rows[0]
  const broken={transaction:fn=>h.db.transaction(client=>fn({query:(sql,values)=>{
    if(sql.startsWith('INSERT INTO ticket_seats')&&values[1]===2)throw new Error('simulated database failure')
    return client.query(sql,values)
  }}))}
  await assert.rejects(ticketAction(broken,{telegram_id:10,is_admin:true},row.id,'allow'),/simulated/)
  assert.equal((await h.db.query('SELECT status FROM tickets WHERE id=$1',[row.id])).rows[0].status,'pending')
  assert.equal((await h.db.query('SELECT * FROM ticket_seats WHERE ticket_id=$1',[row.id])).rows.length,0)
})
test('legacy deletion endpoints do not exist on the VPS',async()=>{
  assert.equal((await h.app.inject('/api/cron-cleanup-qrs')).statusCode,404)
  assert.equal((await call('/api/notify',{})).statusCode,404)
})
test('program reminders use Tashkent time and the worker resumes failed deliveries',async()=>{
  assert.equal(festivalInstant('2027-04-25T09:00:00','10:00').toISOString(),'2027-04-25T05:00:00.000Z')
  const job=(await h.db.query("INSERT INTO broadcasts(message,recipients) VALUES('Test',ARRAY['1']) RETURNING id")).rows[0]
  assert.equal(await expandBroadcast(h.db),true)
  assert.equal(await processDelivery(h.db,h.config,async()=>{throw new Error('network')}),true)
  const row=(await h.db.query('SELECT * FROM deliveries WHERE job_id=$1',[job.id])).rows[0]
  // Earlier ticket/receipt deliveries can be claimed first; the broadcast must still exist durably.
  assert.ok(row)
  await h.db.query("UPDATE deliveries SET available_at=now()-interval '1 minute' WHERE status='pending'")
  for(let i=0;i<20;i++)if(!await processDelivery(h.db,h.config,h.telegram))break
  assert.equal((await h.db.query('SELECT status FROM deliveries WHERE job_id=$1',[job.id])).rows[0].status,'sent')
})
test('concurrent scanners admit a seat once and concurrent workers recover an expired lease once',async()=>{
  const row=(await h.db.query("INSERT INTO tickets(full_name,phone,ticket_count,chat_id,receipt_url) VALUES('Concurrent','123456789',1,1,'file:receipts/test.jpg') RETURNING *")).rows[0]
  await ticketAction(h.db,{telegram_id:10,is_admin:true},row.id,'allow')
  const token=(await h.db.query('SELECT qr_token FROM ticket_seats WHERE ticket_id=$1',[row.id])).rows[0].qr_token
  const scans=await Promise.all([call('/api/checkin',{token},10),call('/api/checkin',{token},10)])
  assert.equal(scans.filter(x=>x.json().ok).length,1)
  assert.equal(scans.filter(x=>x.json().reason==='already_used').length,1)
  // Drain the approval fan-out before isolating the worker claim race.
  for(let i=0;i<10;i++)if(!await processDelivery(h.db,h.config,h.telegram))break
  await enqueue(h.db,'lease-recovery',1,'message',{text:'Recovered'})
  await h.db.query("UPDATE deliveries SET status='sending',attempts=1,leased_until=now()-interval '1 minute' WHERE dedupe_key='lease-recovery'")
  const sent=[]
  await Promise.all([processDelivery(h.db,h.config,async()=>sent.push(true)),processDelivery(h.db,h.config,async()=>sent.push(true))])
  assert.equal(sent.length,1)
})
test('admin content, feedback, and role operations follow server permissions and schedule reminders',async()=>{
  const setting=await call('/api/data/settings',{action:'upsert',values:{key:'festival_date',value:'2027-04-25T09:00:00'}},10)
  assert.equal(setting.statusCode,200,setting.payload)
  assert.equal((await call('/api/data/settings',{action:'upsert',values:{key:'ticket_price',value:'20000'}},10)).statusCode,403)
  const program=await call('/api/data/programs',{action:'insert',values:{title:'Tabiat haqida suhbat',start_time:'10:00',end_time:'11:00',description:null,speaker:null,category:'suhbat',image_url:null}},10)
  assert.equal(program.statusCode,200,program.payload)
  const scheduled=(await h.db.query('SELECT fire_at FROM broadcasts WHERE program_id=$1',[program.json().data[0].id])).rows[0]
  assert.equal(new Date(scheduled.fire_at).toISOString(),'2027-04-25T04:55:00.000Z')
  const suggestion=await call('/api/data/suggestions',{action:'insert',values:{full_name:'Ignored',phone:'+998901234567',message:'A useful festival suggestion',chat_id:2}})
  assert.equal(suggestion.statusCode,200,suggestion.payload)
  assert.equal(String(suggestion.json().data[0].chat_id),'1')
  const replyBody={type:'reply',id:suggestion.json().data[0].id,reply:'Rahmat!',chat_id:2,replied_by:11}
  assert.equal((await call('/api/suggestion',replyBody,1)).statusCode,403)
  assert.equal((await call('/api/suggestion',replyBody,10)).statusCode,200)
  const saved=(await h.db.query('SELECT replied_by FROM suggestions WHERE id=$1',[replyBody.id])).rows[0]
  assert.equal(String(saved.replied_by),'10')
  assert.equal((await call('/api/data/admins',{action:'insert',values:{telegram_id:2}},10)).statusCode,403)
  assert.equal((await call('/api/data/admins',{action:'insert',values:{telegram_id:2,username:'spoofed'}},11)).statusCode,200)
  assert.equal((await call('/api/data/admins',{action:'delete',filters:[{column:'telegram_id',op:'eq',value:11}]},11)).statusCode,409)
  assert.equal((await call('/api/data/admins',{action:'delete',filters:[{column:'telegram_id',op:'eq',value:2}]},11)).statusCode,200)
})
