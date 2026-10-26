import Fastify, { LogController } from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { createReadStream } from 'node:fs'
import { authService, safeEqual, upsertTelegramUser, validateTelegram } from './auth.js'
import { audit, check, httpError, text } from './db.js'
import { dataQuery } from './data.js'
import { storageService } from './storage.js'
import { checkout, ticketAction, checkin, replyToSuggestion } from './tickets.js'
import { enqueue, escapeHtml, telegramClient } from './jobs.js'
import { readPublicContent } from './public-content.js'

export async function buildApp({ db, config, telegram=telegramClient(config), logger=false }) {
  const app=Fastify({ logger, bodyLimit: 1024*1024, trustProxy: config.production ? 1 : false, logController:new LogController({disableRequestLogging:true}) })
  // Request URLs may contain signed file links; never log bodies, cookies, or auth headers.
  app.setErrorHandler((error,request,reply)=>{
    const status=error.statusCode || (error.code==='23505'?409:/^(22|23)/.test(error.code||'')?400:error.code==='ENOENT'?404:500)
    if(status>=500) request.log.error({code:error.code || 'INTERNAL',requestId:request.id},'Request failed')
    const message=status===500?'Server error. Try again.':/^(22|23)/.test(error.code||'')?'Invalid data or conflicting record':error.message
    reply.code(status).send({ok:false,reason:status===500?'server_error':message,message})
  })
  await app.register(cors,{origin:(origin,callback)=>callback(null,!origin||config.origins.has(origin)),credentials:true})
  await app.register(cookie)
  await app.register(helmet,{contentSecurityPolicy:false,crossOriginResourcePolicy:{policy:'cross-origin'}})
  await app.register(multipart,{limits:{fileSize:50*1024*1024,files:1,fields:10,parts:12}})
  await app.register(rateLimit,{max:120,timeWindow:'1 minute'})
  const auth=authService(db,config,telegram),storage=storageService(config)
  app.decorate('services',{auth,storage})
  app.decorateRequest('user',null)
  app.addHook('onRequest',async request=>{
    if(request.url.startsWith('/api/bot')) return
    const origin=request.headers.origin
    check(!origin||config.origins.has(origin),'Origin not allowed',403)
    const bearer=request.headers.authorization?.match(/^Bearer ([\w-]{43})$/)?.[1]
    request.user=await auth.userFor(bearer)
    if(request.method!=='GET'&&request.method!=='HEAD'&&request.method!=='OPTIONS'&&request.cookies.yu_refresh) {
      check(origin&&config.origins.has(origin),'Origin required for cookie requests',403)
    }
  })
  const member=request=>{check(request.user,'Sign in required',401);return request.user}
  const admin=request=>{const u=member(request);check(u.is_admin,'Admin access required',403);return u}
  const cookieOptions={httpOnly:true,secure:config.production,sameSite:'lax',path:'/api/auth',maxAge:30*86400}
  function sessionResponse(reply,tokens,client) {
    reply.header('Cache-Control','no-store')
    if(client==='native'||client==='embedded') return tokens
    reply.setCookie('yu_refresh',tokens.refresh_token,cookieOptions)
    return {access_token:tokens.access_token,expires_in:tokens.expires_in}
  }
  const loginLimit={rateLimit:{max:10,timeWindow:'1 minute'}}
  app.get('/api/health',async()=>({ok:true,service:'yashil-uyim'}))
  app.get('/api/public/content',async(_request,reply)=>{
    reply.header('Cache-Control','public, max-age=60').header('X-Content-Type-Options','nosniff')
    return readPublicContent(db,storage)
  })
  app.get('/api/ready',async()=>{check((await db.query("SELECT name FROM schema_migrations WHERE name='001_initial.sql'")).rows.length,'Schema is not ready',503);return {ok:true}})
  app.post('/api/auth/start',{config:loginLimit},async request=>auth.start(request.body?.verifier))
  app.post('/api/auth/verify',{config:loginLimit},async(request,reply)=>sessionResponse(reply,await auth.verify(request.body||{}),request.body?.client))
  app.post('/api/auth/telegram',{config:loginLimit},async(request,reply)=>{
    const user=validateTelegram(request.body?.init_data,config.botToken)
    const tokens=await db.transaction(async client=>{await upsertTelegramUser(client,user);return auth.issueSession(client,String(user.id))})
    return sessionResponse(reply,tokens,request.body?.client)
  })
  app.post('/api/auth/refresh',{config:loginLimit},async(request,reply)=>sessionResponse(reply,await auth.refresh(request.body?.refresh_token||request.cookies.yu_refresh),request.body?.client))
  app.post('/api/auth/logout',async(request,reply)=>{
    const user=request.user
    if(user) await db.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[user.session_id])
    await auth.logout(request.body?.refresh_token||request.cookies.yu_refresh)
    reply.clearCookie('yu_refresh',cookieOptions)
    return {ok:true}
  })
  app.get('/api/auth/me',async(request,reply)=>{
    reply.header('Cache-Control','no-store');const u=member(request)
    return {id:Number(u.telegram_id),username:u.username,first_name:u.first_name,last_name:u.last_name,phone:u.phone,is_admin:u.is_admin,is_super:u.is_super,is_tester:u.is_tester}
  })
  app.post('/api/data/:table',async request=>({data:await dataQuery(db,request.user,request.params.table,request.body,storage),error:null}))
  app.post('/api/tickets/checkout',{config:{rateLimit:{max:10,timeWindow:'10 minutes'}}},async request=>{
    const u=member(request),fields=Object.create(null);let buffer
    for await(const part of request.parts()) {
      if(part.type==='file') {check(part.fieldname==='receipt','Invalid file field');buffer=await part.toBuffer();check(!part.file.truncated,'Receipt too large',413)}
      else fields[part.fieldname]=part.value
    }
    return {ticket:await checkout(db,u,fields,buffer,storage)}
  })
  app.post('/api/admin-action',async request=>({ok:true,ticket:storage.decorate(await ticketAction(db,admin(request),request.body?.ticket?.id||request.body?.ticket_id,request.body?.action))}))
  app.post('/api/checkin',async request=>storage.decorate(await checkin(db,admin(request),request.body||{})))
  app.post('/api/suggestion',async request=>{
    check(request.body?.type==='reply','Create feedback using the suggestions collection')
    return replyToSuggestion(db,admin(request),request.body)
  })
  app.post('/api/broadcast',async request=>{
    const u=admin(request);check(u.is_super,'Super admin access required',403)
    const {mode}=request.body||{};let message
    if(mode==='event_announcement') {
      const settings=Object.fromEntries((await db.query("SELECT key,value FROM settings WHERE key IN ('festival_date','festival_address')")).rows.map(x=>[x.key,x.value]))
      message=`🌿 YASHIL UYIM\n\n📅 ${escapeHtml(settings.festival_date||'')}\n📍 ${escapeHtml(settings.festival_address||'Toshkent')}`
    } else {check(mode==='custom','Unknown broadcast mode');message=escapeHtml(text(request.body.message,'message',3500))}
    return db.transaction(async client=>{
      const recipients=(await client.query('SELECT telegram_id FROM users ORDER BY telegram_id')).rows.map(x=>String(x.telegram_id))
      const job=(await client.query('INSERT INTO broadcasts(message,recipients,created_by) VALUES($1,$2,$3) RETURNING id',[message,recipients,u.telegram_id])).rows[0]
      await audit(client,u.telegram_id,'broadcast','broadcasts',job.id)
      return {ok:true,queued:true,job_id:job.id,recipients:recipients.length}
    })
  })
  app.post('/api/storage/media',async request=>{
    admin(request);const fields=Object.create(null);let buffer
    for await(const part of request.parts()) {
      if(part.type==='file'){buffer=await part.toBuffer();check(!part.file.truncated,'File too large',413)}else fields[part.fieldname]=part.value
    }
    check(buffer,'File required');return storage.media(buffer,text(fields.path,'path',500))
  })
  app.delete('/api/storage/media',async request=>{
    const u=admin(request);const paths=request.body?.paths
    check(Array.isArray(paths)&&paths.length<=20,'Invalid paths')
    for(const key of paths) {check(/^(gallery|news|programs|misc)\//.test(key),'Invalid media folder');await storage.remove('media',key)}
    await audit(db,u.telegram_id,'delete','media',paths.join(','));return {data:[],error:null}
  })
  app.get('/api/files/:bucket/*',async(request,reply)=>{
    const result=await storage.read(request.params.bucket,request.params['*'],request.query)
    const privateFile=request.params.bucket==='receipts'||request.params['*'].startsWith('qr/')
    reply.header('Cache-Control',privateFile?'private, no-store':'public, max-age=31536000, immutable')
    reply.header('X-Content-Type-Options','nosniff').type(result.type)
    // Small byte ranges let gallery videos seek without exposing the upload directory.
    const range=request.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
    const size=result.size ?? result.buffer.length
    if(range) {
      const start=Number(range[1]),end=range[2]?Number(range[2]):size-1
      check(start<=end&&end<size,'Invalid byte range',416)
      reply.code(206).header('Content-Range',`bytes ${start}-${end}/${size}`).header('Content-Length',end-start+1)
      return result.buffer?result.buffer.subarray(start,end+1):createReadStream(result.filePath,{start,end})
    }
    reply.header('Accept-Ranges','bytes').header('Content-Length',size);return result.buffer||createReadStream(result.filePath)
  })
  app.post('/api/bot', {config:{rateLimit:false}}, async(request,reply)=>{
    check(safeEqual(request.headers['x-telegram-bot-api-secret-token'],config.webhookSecret),'Invalid webhook secret',401)
    const update=request.body||{}
    check(Number.isSafeInteger(update.update_id),'Invalid Telegram update')
    const result=await db.transaction(async client=>{
      const inserted=await client.query('INSERT INTO telegram_updates(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id',[update.update_id])
      if(!inserted.rows.length) return false
      const msg=update.message,callback=update.callback_query
      if(msg?.chat?.type==='private'&&/^\/start login_[\w-]{32}$/.test(msg.text||'')) {
        check(msg.from?.id===msg.chat.id,'Private login required',403)
        await auth.deliverCode(msg.text.slice('/start login_'.length),msg.from,client)
        return false
      }
      if(callback) {
        const actor=(await client.query(`SELECT u.*,true AS is_admin,a.is_super FROM users u JOIN admins a ON a.telegram_id=u.telegram_id WHERE u.telegram_id=$1`,[callback.from?.id||0])).rows[0]
        check(actor,'Admin access required',403)
        const match=/^(allow|fake):([1-9]\d*)$/.exec(callback.data||'')
        check(match,'Invalid callback')
        await ticketAction(client,actor,match[2],match[1])
        return {callbackId:callback.id}
      }
      if(msg?.chat?.type==='private'&&msg.from?.id===msg.chat.id&&msg.text?.startsWith('/sms ')) {
        const allowed=(await client.query('SELECT is_super FROM admins WHERE telegram_id=$1',[msg.from.id])).rows[0]?.is_super
        check(allowed,'Super admin access required',403)
        const message=escapeHtml(text(msg.text.slice(5),'message',3500))
        const recipients=(await client.query('SELECT telegram_id FROM users ORDER BY telegram_id')).rows.map(x=>String(x.telegram_id))
        await client.query('INSERT INTO broadcasts(message,recipients,created_by) VALUES($1,$2,$3)',[message,recipients,msg.from.id])
        await audit(client,msg.from.id,'broadcast','telegram',update.update_id)
        return false
      }
      if(msg?.chat?.type==='private'&&msg.from?.id===msg.chat.id&&(msg.text==='/start'||msg.text==='/help')) {
        await upsertTelegramUser(client,msg.from)
        await enqueue(client,`start:${update.update_id}`,msg.chat.id,'message',{text:'🌿 Yashil Uyim\nFestival chiptalari, dastur va yangiliklar.',reply_markup:{inline_keyboard:[[{text:'Ilovani ochish',web_app:{url:config.publicUrl}}]]}})
      }
      return false
    })
    if(result?.callbackId) {
      // A failed acknowledgement must not undo or replay the committed approval.
      await telegram('answerCallbackQuery',{callback_query_id:result.callbackId,text:'Saqlandi'}).catch(()=>{})
    }
    return reply.send({ok:true})
  })
  // No legacy cron deletion/notification endpoints are mounted on the VPS.
  app.setNotFoundHandler(()=>{throw httpError(404,'Not found')})
  return app
}
