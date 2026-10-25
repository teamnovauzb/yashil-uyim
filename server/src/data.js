import { audit, check, text, id } from './db.js'
import { escapeHtml, notifyAdmins, scheduleReminder } from './jobs.js'

const tables = {
 users: ['telegram_id','username','first_name','last_name','phone','is_tester','created_at'],
 admins: ['telegram_id','username','first_name','is_super','added_by','created_at'],
 tickets: ['id','ticket_number','full_name','phone','ticket_count','status','chat_id','receipt_url','qr_token','qr_url','checked_in_count','last_checkin_at','created_at'],
 ticket_seats: ['ticket_id','seat_index','qr_token','qr_url','checked_in_at','created_at'],
 suggestions: ['id','full_name','email','phone','message','chat_id','reply','replied_at','replied_by','created_at'],
 news: ['id','title','content','image_url','published_at','created_at'],
 programs: ['id','title','description','speaker','category','image_url','start_time','end_time','created_at'],
 gallery: ['id','media_type','media_url','thumbnail_url','caption','sort_order','created_at'],
 settings: ['key','value','updated_at'],
 broadcasts: ['id','message','recipients','done','created_at','fire_at','program_id','audience'],
}
const publicTables = new Set(['news','programs','gallery','settings'])
const publicSettings = ['festival_date','festival_address','festival_lat','festival_lng','festival_yandex_url','payment_card','payment_card_holder','ticket_price']
const adminSettings = new Set(['festival_date','festival_address','festival_lat','festival_lng','festival_yandex_url'])
const writeFields = {
 news:['title','content','image_url','published_at'], programs:['title','description','speaker','category','image_url','start_time','end_time'],
 gallery:['media_type','media_url','thumbnail_url','caption','sort_order'],
 users:['phone','is_tester'], admins:['telegram_id','username','first_name','added_by'], settings:['key','value'],
 suggestions:['full_name','email','phone','message'],
}

export async function dataQuery(db, user, table, body, storage) {
  check(Object.hasOwn(tables,table), 'Unknown collection', 404)
  const { action='select', filters=[], orders=[], limit=1000, offset=0 } = body || {}
  check(['select','insert','update','upsert','delete'].includes(action), 'Invalid action')
  check(Array.isArray(filters) && filters.length<=10 && Array.isArray(orders) && orders.length<=3, 'Invalid query')
  check(Number.isInteger(limit) && limit>=1 && limit<=1000 && Number.isInteger(offset) && offset>=0, 'Invalid pagination')
  check(user || (action==='select' && publicTables.has(table)), 'Sign in required',401)
  const admin = user?.is_admin, superAdmin = user?.is_super
  if (['admins','broadcasts'].includes(table)) check(admin, 'Admin access required',403)
  const values=[], clauses=[]
  const bind = value => { values.push(value); return `$${values.length}` }
  for (const filter of filters) {
    check(filter && tables[table].includes(filter.column) && ['eq','in'].includes(filter.op), 'Invalid filter')
    if (filter.op==='in') {
      check(Array.isArray(filter.value) && filter.value.length>0 && filter.value.length<=200 && filter.value.every(v=>['string','number','boolean'].includes(typeof v)), 'Invalid filter values')
      clauses.push(`"${filter.column}" IN (${filter.value.map(bind).join(',')})`)
    } else {
      check(filter.value===null || ['string','number','boolean'].includes(typeof filter.value), 'Invalid filter value')
      clauses.push(filter.value===null?`"${filter.column}" IS NULL`:`"${filter.column}"=${bind(filter.value)}`)
    }
  }
  if (table==='settings') clauses.push(`key IN (${publicSettings.map(bind).join(',')})`)
  if (table==='users' && !admin) clauses.push(`telegram_id=${bind(user.telegram_id)}`)
  if (['tickets','suggestions'].includes(table) && !admin) clauses.push(`chat_id=${bind(user.telegram_id)}`)
  if (table==='ticket_seats' && !admin) clauses.push(`ticket_id IN (SELECT id FROM tickets WHERE chat_id=${bind(user.telegram_id)})`)
  const where = clauses.length?` WHERE ${clauses.join(' AND ')}`:''
  if (action==='select') {
    const order = orders.map(o=>{check(tables[table].includes(o.column),'Invalid sort');return `"${o.column}" ${o.ascending===false?'DESC':'ASC'}`})
    const stableKeys=table==='ticket_seats'?['ticket_id','seat_index']:table==='settings'?['key']:['users','admins'].includes(table)?['telegram_id']:['id']
    for(const key of stableKeys)if(!orders.some(o=>o.column===key))order.push(`"${key}" ASC`)
    const rows=(await db.query(`SELECT ${tables[table].map(c=>`"${c}"`).join(',')} FROM "${table}"${where}${order.length?' ORDER BY '+order.join(','):''} LIMIT ${bind(limit)} OFFSET ${bind(offset)}`,values)).rows
    if (table==='tickets' && rows.length) {
      const seats=(await db.query('SELECT * FROM ticket_seats WHERE ticket_id=ANY($1::bigint[]) ORDER BY seat_index',[rows.map(x=>x.id)])).rows
      for (const row of rows) row.ticket_seats=seats.filter(x=>String(x.ticket_id)===String(row.id))
    }
    return storage.decorate(rows)
  }
  check(table!=='broadcasts' && table!=='ticket_seats','Use the dedicated operation',403)
  if (action==='delete') {
    check((table==='tickets' || table==='admins')?superAdmin:admin,'Insufficient permissions',403)
    check(filters.length && filters.some(f=>[table==='admins'?'telegram_id':'id'].includes(f.column)), 'Select records to delete')
    return db.transaction(async client=>{
      if(table==='admins') {
        await client.query('LOCK TABLE admins IN SHARE ROW EXCLUSIVE MODE')
        const selected=(await client.query(`SELECT telegram_id,is_super FROM admins${where} FOR UPDATE`,values)).rows
        check(!selected.some(x=>x.is_super),'Super administrators cannot be deleted here',409)
      }
      const rows=(await client.query(`DELETE FROM "${table}"${where} RETURNING *`,values)).rows
      if(table==='programs') for(const row of rows) await client.query('DELETE FROM broadcasts WHERE program_id=$1 AND expanded_at IS NULL',[row.id])
      await audit(client,user.telegram_id,'delete',table,rows.map(x=>x.id||x.telegram_id).join(','))
      return rows
    })
  }
  const input=Array.isArray(body.values)?body.values:[body.values]
  check(input.length===1 && input[0] && typeof input[0]==='object','One record is required')
  const payload={...input[0]}
  if(table==='users') {
    if(!superAdmin) { check(!('is_tester' in payload),'Super admin access required',403); check(!admin || String(payload.telegram_id||user.telegram_id)===String(user.telegram_id),'Use your own profile',403) }
    if('telegram_id' in payload) { check(superAdmin || String(payload.telegram_id)===String(user.telegram_id),'Invalid owner',403); delete payload.telegram_id }
    // Names and usernames are only updated from verified Telegram data.
    delete payload.username; delete payload.first_name; delete payload.last_name
    check(!('is_tester' in payload) || typeof payload.is_tester==='boolean','Invalid tester flag')
    if('phone' in payload) check(payload.phone===null || /^\+?[\d ()-]{7,25}$/.test(payload.phone),'Invalid phone')
  } else if(table==='admins') {
    check(superAdmin && action==='insert','Super admin access required',403)
    id(payload.telegram_id)
    const target=(await db.query('SELECT * FROM users WHERE telegram_id=$1',[payload.telegram_id])).rows[0]
    check(target,'User must sign in first',400)
    payload.username=target.username; payload.first_name=target.first_name; payload.added_by=user.telegram_id
  } else if(table==='suggestions') {
    check(action==='insert','Use the reply operation',403)
    delete payload.chat_id
    payload.message=text(payload.message,'message',3000,5)
    payload.full_name=[user.first_name,user.last_name].filter(Boolean).join(' ')||'Mehmon'
  } else {
    check(admin,'Admin access required',403)
  }
  check(writeFields[table], 'Use the dedicated operation',403)
  for(const key of Object.keys(payload)) check(writeFields[table].includes(key),`Field ${key} cannot be changed`)
  check(Object.keys(payload).length>0,'No changes supplied')
  if(table==='settings') {
    check(publicSettings.includes(payload.key),'Unknown setting')
    check(superAdmin||adminSettings.has(payload.key),'Super admin access required',403)
    check(typeof payload.value==='string' && payload.value.length<=2000,'Invalid setting')
    if(payload.key==='ticket_price') check(/^\d+(\.\d{1,2})?$/.test(payload.value) && Number(payload.value)>0 && Number(payload.value)<1e9,'Invalid ticket price')
    if(payload.key==='festival_date') check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(payload.value) && !Number.isNaN(new Date(payload.value+'+05:00').getTime()),'Invalid festival date')
  }
  if(['news','programs'].includes(table)) {
    if('title'in payload) payload.title=text(payload.title,'title',200)
    if('content'in payload) payload.content=text(payload.content,'content',20000)
    for(const [key,max]of [['description',5000],['speaker',200],['category',80]]) if(key in payload) check(payload[key]===null || (typeof payload[key]==='string' && payload[key].length<=max),`Invalid ${key}`)
    for(const key of ['start_time','end_time']) if(key in payload) check(payload[key]===null || /^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(payload[key]),`Invalid ${key}`)
    if('published_at'in payload) check(!Number.isNaN(new Date(payload.published_at).getTime()),'Invalid publication date')
  }
  if(table==='gallery') {
    if('media_type'in payload) check(['image','video'].includes(payload.media_type),'Invalid media type')
    if('sort_order'in payload) check(Number.isInteger(payload.sort_order),'Invalid sort order')
    if('caption'in payload) check(payload.caption===null || (typeof payload.caption==='string' && payload.caption.length<=2000),'Invalid caption')
  }
  for(const key of ['image_url','media_url','thumbnail_url']) if(key in payload) payload[key]=storage.storedFromPublic(payload[key])
  return db.transaction(async client=>{
    let rows
    if(table==='users') {
      const target=filters.find(f=>f.column==='telegram_id'&&f.op==='eq')?.value || user.telegram_id
      check(superAdmin || String(target)===String(user.telegram_id),'Invalid owner',403)
      const keys=Object.keys(payload), v=Object.values(payload)
      rows=(await client.query(`UPDATE users SET ${keys.map((k,i)=>`"${k}"=$${i+1}`).join(',')} WHERE telegram_id=$${v.length+1} RETURNING *`,[...v,target])).rows
    } else if(action==='update') {
      check(filters.some(f=>f.column==='id'&&f.op==='eq'),'Select a record to update')
      const sets=Object.entries(payload).map(([k,v])=>`"${k}"=${bind(v)}`)
      rows=(await client.query(`UPDATE "${table}" SET ${sets.join(',')}${where} RETURNING *`,values)).rows
    } else {
      check(action==='insert'||(action==='upsert'&&table==='settings'),'Unsupported operation')
      if(table==='suggestions') payload.chat_id=user.telegram_id
      const keys=Object.keys(payload), v=Object.values(payload)
      const conflict=table==='settings'?` ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`:''
      rows=(await client.query(`INSERT INTO "${table}"(${keys.map(k=>`"${k}"`).join(',')}) VALUES(${v.map((_,i)=>`$${i+1}`).join(',')})${conflict} RETURNING *`,v)).rows
    }
    if(table==='programs') for(const row of rows) await scheduleReminder(client,row)
    if(table==='settings'&&payload.key==='festival_date') {
      for(const row of (await client.query('SELECT * FROM programs')).rows) await scheduleReminder(client,row)
    }
    if(table==='suggestions') for(const row of rows) await notifyAdmins(client,`suggestion:${row.id}`,'message',{text:`💡 Yangi taklif #${row.id}\n\n${escapeHtml(row.message)}`},true)
    await audit(client,user.telegram_id,action,table,rows[0]?.id||payload.key||rows[0]?.telegram_id)
    return storage.decorate(rows)
  })
}
