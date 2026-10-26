import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { createDb } from '../src/db.js'
import { migrateDatabase } from '../scripts/migrate.js'
import { buildApp } from '../src/app.js'
import { processDelivery, enqueue } from '../src/jobs.js'
import { multipartPayload } from './helpers.js'

test('native shared-host database profile isolates roles, supports the application, and leaves existing databases alone',{
  skip:!process.env.TEST_POSTGRES_ADMIN_URL,
},async()=>{
  const adminUrl=new URL(process.env.TEST_POSTGRES_ADMIN_URL),container=process.env.TEST_POSTGRES_CONTAINER
  assert.ok(['127.0.0.1','localhost'].includes(adminUrl.hostname)&&adminUrl.username==='yu_test_runner')
  assert.match(container||'',/^yashiluyim-local-qa-[a-f0-9]{12}$/)
  const admin=createDb(adminUrl.toString()),migratorPassword=randomBytes(32).toString('hex'),appPassword=randomBytes(32).toString('hex')
  const uploadDir=await mkdtemp(path.join(os.tmpdir(),'yashiluyim-native-test-'))
  const command=(args,input,env={})=>{
    const result=spawnSync('docker',['exec','-i',...Object.keys(env).flatMap(key=>['--env',key]),container,...args],{input,encoding:'utf8',env:{...process.env,...env}})
    assert.equal(result.status,0,result.stderr||result.error?.message);return result.stdout
  }
  const readProfile=name=>readFile(new URL(`../../deploy/hetzner/${name}`,import.meta.url),'utf8')
  let owner,runtime,other,app
  try {
    await admin.query('CREATE DATABASE existing_app_fixture')
    const otherUrl=new URL(adminUrl);otherUrl.pathname='/existing_app_fixture';other=createDb(otherUrl.toString())
    await other.query("CREATE TABLE sentinel(value text); INSERT INTO sentinel VALUES('leave this application alone')")
    const bootstrap=await readProfile('postgres-bootstrap.sql')
    command(['psql','-X','-U','yu_test_runner','-d','postgres'],bootstrap,{YASHILUYIM_MIGRATOR_PASSWORD:migratorPassword,YASHILUYIM_APP_PASSWORD:appPassword})
    // The exact same bootstrap must refuse a second run without resetting a password or taking over data.
    const repeated=spawnSync('docker',['exec','-i','--env','YASHILUYIM_MIGRATOR_PASSWORD','--env','YASHILUYIM_APP_PASSWORD',container,'psql','-X','-U','yu_test_runner','-d','postgres'],{
      input:bootstrap,encoding:'utf8',env:{...process.env,YASHILUYIM_MIGRATOR_PASSWORD:migratorPassword,YASHILUYIM_APP_PASSWORD:appPassword},
    })
    assert.notEqual(repeated.status,0)
    let fragment=await readProfile('pg_hba.conf.fragment')
    // A published loopback port reaches PostgreSQL through Docker's private gateway.
    // Add only that exact client address to THIS disposable fixture, not the deployment template.
    const clientAddress=(await admin.query('SELECT host(inet_client_addr()) AS address')).rows[0].address
    if(clientAddress!=='127.0.0.1') {
      assert.match(clientAddress,/^(172\.(1[6-9]|2\d|3[01])|192\.168|10\.\d+)\.\d+\.\d+$/)
      fragment=fragment.replace('host all ',`host yashiluyim yashiluyim_app,yashiluyim_migrator ${clientAddress}/32 scram-sha-256\nhost all `)
    }
    command(['sh','-c','cat > /tmp/yashiluyim-hba; cat "$PGDATA/pg_hba.conf" >> /tmp/yashiluyim-hba; cat /tmp/yashiluyim-hba > "$PGDATA/pg_hba.conf"'],fragment+'\n')
    await admin.query('SELECT pg_reload_conf()')
    assert.equal((await admin.query('SELECT * FROM pg_hba_file_rules WHERE error IS NOT NULL')).rows.length,0)
    const ownUrl=new URL(adminUrl);ownUrl.username='yashiluyim_migrator';ownUrl.password=migratorPassword;ownUrl.pathname='/yashiluyim'
    owner=createDb(ownUrl.toString())
    await migrateDatabase(owner)
    command(['psql','-X','-h','127.0.0.1','-U','yashiluyim_migrator','-d','yashiluyim'],await readProfile('postgres-runtime-grants.sql'),{PGPASSWORD:migratorPassword})
    const appUrl=new URL(ownUrl);appUrl.username='yashiluyim_app';appUrl.password=appPassword;runtime=createDb(appUrl.toString())
    const permissions=(await runtime.query("SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0]
    assert.deepEqual(Object.values(permissions),[false,false,false,false,false])
    await assert.rejects(runtime.query('CREATE TABLE unauthorized(id int)'),/permission denied/)
    await assert.rejects(runtime.query('DROP TABLE users'),/must be owner/)
    await assert.rejects(runtime.query('TRUNCATE users CASCADE'),/permission denied/)
    await assert.rejects(runtime.query("UPDATE schema_migrations SET sha256='tampered'"),/permission denied/)
    const forbiddenUrl=new URL(appUrl);forbiddenUrl.pathname='/existing_app_fixture'
    const forbidden=createDb(forbiddenUrl.toString())
    try {await assert.rejects(forbidden.query('SELECT 1'),/pg_hba.conf rejects/)}finally{await forbidden.close()}
    forbiddenUrl.username='yashiluyim_migrator';forbiddenUrl.password=migratorPassword
    const forbiddenMigration=createDb(forbiddenUrl.toString())
    try {await assert.rejects(forbiddenMigration.query('SELECT 1'),/pg_hba.conf rejects/)}finally{await forbiddenMigration.close()}
    await owner.query("INSERT INTO users(telegram_id,first_name) VALUES(1,'Guest'),(10,'Administrator'); INSERT INTO admins(telegram_id,is_super) VALUES(10,true)")
    const config={production:false,secret:'local-native-profile-test-secret-123456789',botToken:'999:test-token',webhookSecret:'native_test_webhook_secret_1234567890',botUsername:'YashilUyimTestBot',publicUrl:'http://127.0.0.1:4173',origins:new Set(['http://127.0.0.1:4173']),uploadDir}
    app=await buildApp({db:runtime,config,telegram:async()=>({message_id:1})})
    const guest=await app.services.auth.issueSession(runtime,'1'),operator=await app.services.auth.issueSession(runtime,'10')
    const image=await sharp({create:{width:8,height:8,channels:3,background:'#ffffff'}}).png().toBuffer()
    const form=await multipartPayload({full_name:'Guest',phone:'+998901234567',ticket_count:1,request_key:randomUUID()},image)
    const purchase=await app.inject({method:'POST',url:'/api/tickets/checkout',...form,headers:{...form.headers,authorization:`Bearer ${guest.access_token}`}})
    assert.equal(purchase.statusCode,200,purchase.payload)
    const ticket=purchase.json().ticket
    const approval=await app.inject({method:'POST',url:'/api/admin-action',headers:{authorization:`Bearer ${operator.access_token}`},payload:{action:'allow',ticket_id:ticket.id}})
    assert.equal(approval.statusCode,200,approval.payload)
    const admission=await app.inject({method:'POST',url:'/api/checkin',headers:{authorization:`Bearer ${operator.access_token}`},payload:{token:approval.json().ticket.qr_token}})
    assert.equal(admission.json().admitted,1,admission.payload)
    assert.equal((await app.inject('/api/ready')).statusCode,200)
    await enqueue(runtime,'permissions-check',1,'message',{text:'Mock message'})
    assert.equal(await processDelivery(runtime,config,async()=>({message_id:1})),true)
    assert.equal((await other.query('SELECT value FROM sentinel')).rows[0].value,'leave this application alone')
  }finally{
    await app?.close();await runtime?.close();await owner?.close();await other?.close();await admin.close()
    assert.ok(uploadDir.startsWith(path.join(os.tmpdir(),'yashiluyim-native-test-')))
    await rm(uploadDir,{recursive:true,force:true})
  }
})
