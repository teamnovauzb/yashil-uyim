import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { harness } from './helpers.js'
import { domainTables, writeJson, sha256, loadSnapshot, importSnapshot, verifyTarget, targetPlan } from '../scripts/transfer-lib.js'
import { migrateDatabase } from '../scripts/migrate.js'

test('migration preserves identities, QR tokens, check-ins, files, and sequences, and refuses an occupied target',async()=>{
  const h=await harness()
  try {
    const source=path.join(h.config.uploadDir,'snapshot')
    const created='2026-04-24T05:00:00.000Z'
    const tables={
      users:[{telegram_id:'1',username:'purchaser',first_name:'Person',last_name:null,phone:'+998901234567',is_tester:false,created_at:created}],
      admins:[{telegram_id:'99',username:null,first_name:null,is_super:true,added_by:null,created_at:created}],
      tickets:[{id:'7',ticket_number:50000,full_name:'Person',phone:'+998901234567',ticket_count:1,status:'approved',chat_id:'1',receipt_url:'https://source.supabase.co/storage/v1/object/public/receipts/receipt.jpg',qr_token:'preserve_this_qr_token',qr_url:'https://source.supabase.co/storage/v1/object/public/media/qr/ticket.png',checked_in_count:1,last_checkin_at:created,created_at:created}],
      ticket_seats:[{ticket_id:'7',seat_index:1,qr_token:'preserve_this_qr_token',qr_url:'https://source.supabase.co/storage/v1/object/public/media/qr/ticket.png',checked_in_at:created,created_at:created}],
      settings:[{key:'festival_date',value:'2026-04-25T09:00:00',updated_at:created}],
      broadcasts:[{id:'5',message:'Preserve job',recipients:['1'],next_offset:1,sent:1,failed:0,done:true,created_by:'99',created_at:created,updated_at:created,last_error:null,failed_recipients:[],retry_count:0,fire_at:null,program_id:null,audience:'all'}],
    }
    const manifest={version:1,unknown_tables:[],storage_origin:'https://source.supabase.co',source_identity:'synthetic-source',tables:{},files:[]}
    for(const name of domainTables) {
      await writeJson(path.join(source,`${name}.json`),tables[name]||[])
      manifest.tables[name]={rows:tables[name]?.length||0,sha256:sha256(await readFile(path.join(source,`${name}.json`)))}
    }
    for(const [bucket,key]of [['receipts','receipt.jpg'],['media','qr/ticket.png']]) {
      const target=path.join(source,'files',bucket,key),bytes=Buffer.from('synthetic preserved file')
      await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes)
      manifest.files.push({bucket,key,bytes:bytes.length,sha256:sha256(bytes)})
    }
    await writeJson(path.join(source,'manifest.json'),manifest)
    const snapshot=await loadSnapshot(source)
    const report=await importSnapshot(h.db,snapshot,path.join(h.config.uploadDir,'target'))
    assert.equal(report.tables.tickets,1);assert.equal(report.files,2);assert.equal(report.placeholderUsers,1)
    const ticket=(await h.db.query('SELECT * FROM tickets WHERE id=7')).rows[0]
    assert.equal(ticket.qr_token,'preserve_this_qr_token');assert.equal(ticket.checked_in_count,1);assert.equal(ticket.receipt_url,'file:receipts/receipt.jpg')
    assert.ok((await h.db.query('SELECT checked_in_at FROM ticket_seats')).rows[0].checked_in_at)
    assert.equal(String((await h.db.query("SELECT nextval('ticket_number_seq') AS next")).rows[0].next),'100000')
    assert.equal(String((await h.db.query("SELECT nextval(pg_get_serial_sequence('tickets','id')) AS next")).rows[0].next),'8')
    await migrateDatabase(h.db)
    await assert.rejects(importSnapshot(h.db,snapshot,path.join(h.config.uploadDir,'target')),/not empty/)
    await h.db.query("UPDATE tickets SET phone='tampered' WHERE id=7")
    await assert.rejects(verifyTarget(h.db,snapshot,path.join(h.config.uploadDir,'target')),/Target value differs: tickets.phone/)
    const unsupported=structuredClone(snapshot);unsupported.tables.users[0].unknown_source_field='review me'
    await assert.rejects(targetPlan(h.db,unsupported),/Unmapped source column/)
    await writeFile(path.join(source,'users.json'),'[]')
    await assert.rejects(loadSnapshot(source),/checksum mismatch/)
  } finally{await h.close()}
})
