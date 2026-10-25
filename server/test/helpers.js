import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { createDb } from '../src/db.js'
import { migrateDatabase } from '../scripts/migrate.js'
import { buildApp } from '../src/app.js'

export async function harness() {
  const calls=[],uploadDir=await mkdtemp(path.join(os.tmpdir(),'yashiluyim-test-'))
  const wrap=client=>({query:async(sql,params)=>params===undefined?(await client.exec(sql)).at(-1)||{rows:[]}:client.query(sql,params)})
  let db,closeDb
  if(process.env.TEST_POSTGRES_ADMIN_URL) {
    const url=new URL(process.env.TEST_POSTGRES_ADMIN_URL)
    if(!['127.0.0.1','localhost'].includes(url.hostname)||url.username!=='yu_test_runner')throw new Error('PostgreSQL tests require the disposable local yu_test_runner instance')
    const admin=createDb(url.toString()),name=`yashiluyim_test_${randomUUID().replaceAll('-','')}`
    await admin.query(`CREATE DATABASE "${name}"`)
    url.pathname=`/${name}`;db=createDb(url.toString())
    closeDb=async()=>{await db.close();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.close()}
  }else{
    const engine=new PGlite()
    db={...wrap(engine),transaction:fn=>engine.transaction(client=>fn(wrap(client)))}
    closeDb=()=>engine.close()
  }
  await migrateDatabase(db)
  const config={secret:'local-test-secret-never-use-in-production',botToken:'999:test-token',webhookSecret:'test_webhook_secret_12345678901234567890',botUsername:'YashilUyimTestBot',publicUrl:'http://127.0.0.1:4173',origins:new Set(['http://127.0.0.1:4173']),production:false,uploadDir}
  const telegram=async(method,payload)=>{calls.push({method,payload});return {message_id:calls.length}}
  const app=await buildApp({db,config,telegram})
  await app.ready()
  return {db,config,app,calls,telegram,async seed(){
    await db.query(`INSERT INTO users(telegram_id,first_name) VALUES(1,'One'),(2,'Two'),(10,'Admin'),(11,'Super')`)
    await db.query('INSERT INTO admins(telegram_id,is_super) VALUES(10,false),(11,true)')
    const tokens={}
    for(const userId of [1,2,10,11])tokens[userId]=await app.services.auth.issueSession(db,String(userId))
    return tokens
  },async close(){await app.close();await closeDb();if(!uploadDir.startsWith(path.join(os.tmpdir(),'yashiluyim-test-')))throw new Error('Unexpected test directory');await rm(uploadDir,{recursive:true,force:true})}}
}
export async function multipartPayload(fields,file=Buffer.from('not an image')) {
  const form=new FormData()
  for(const [key,value]of Object.entries(fields))form.set(key,String(value))
  form.set('receipt',new Blob([file],{type:'image/png'}),'receipt.png')
  const request=new Request('http://localhost',{method:'POST',body:form})
  return {payload:Buffer.from(await request.arrayBuffer()),headers:{'content-type':request.headers.get('content-type')}}
}
