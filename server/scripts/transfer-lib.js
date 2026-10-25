import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { safePath } from '../src/storage.js'
import { check } from '../src/db.js'

export const domainTables=['users','admins','tickets','ticket_seats','suggestions','news','programs','gallery','settings','broadcasts']
export const primaryKeys={users:['telegram_id'],admins:['telegram_id'],ticket_seats:['ticket_id','seat_index'],settings:['key']}
export const sha256=value=>createHash('sha256').update(value).digest('hex')
export const identity=url=>{const parsed=new URL(url);return sha256(`${parsed.hostname}:${parsed.port||5432}${parsed.pathname}`)}
const json=value=>JSON.stringify(value,null,2)+'\n'
export async function writeJson(file,value){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,json(value),{mode:0o600,flag:'wx'})}
export async function loadSnapshot(directory) {
  const manifest=JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'))
  check(manifest.version===1,'Unsupported snapshot')
  check(typeof manifest.storage_origin==='string'&&/^https:\/\/[^/]+$/.test(manifest.storage_origin),'Invalid snapshot storage origin')
  check(manifest.tables&&Array.isArray(manifest.files),'Invalid snapshot manifest')
  check(manifest.unknown_tables?.length===0,'Snapshot contains unmapped public tables; review before importing')
  const tables={}
  for(const name of domainTables) {
    const entry=manifest.tables[name];if(!entry)continue
    const bytes=await readFile(path.join(directory,`${name}.json`))
    check(sha256(bytes)===entry.sha256,`Snapshot checksum mismatch: ${name}`)
    tables[name]=JSON.parse(bytes.toString())
    check(Array.isArray(tables[name]),`Invalid snapshot table: ${name}`)
    check(tables[name].length===entry.rows,`Snapshot row count mismatch: ${name}`)
  }
  for(const file of manifest.files) {
    const bytes=await readFile(safePath(path.join(directory,'files'),file.bucket,file.key))
    check(bytes.length===file.bytes&&sha256(bytes)===file.sha256,`Snapshot file checksum mismatch: ${file.bucket}/${file.key}`)
  }
  return {manifest,tables,directory:path.join(directory,'files')}
}
export function mappedRows(snapshot) {
  const fileSet=new Set(snapshot.manifest.files.map(f=>`${f.bucket}/${f.key}`))
  const sourceOrigin=snapshot.manifest.storage_origin
  const output=structuredClone(snapshot.tables)
  for(const rows of Object.values(output))for(const row of rows)for(const [key,value] of Object.entries(row)) {
    if(!key.endsWith('_url')||typeof value!=='string'||!value.startsWith(sourceOrigin+'/storage/'))continue
    const match=new URL(value).pathname.match(/^\/storage\/v1\/object\/(?:public|authenticated|sign)\/(media|receipts)\/(.+)$/)
    check(match,`Unmapped storage URL in ${key}`)
    const fileKey=`${match[1]}/${decodeURIComponent(match[2])}`
    check(fileSet.has(fileKey),`Referenced storage file is missing: ${fileKey}`)
    row[key]=`file:${fileKey}`
  }
  const users=output.users||=[];const known=new Set(users.map(u=>String(u.telegram_id))),added=[]
  for(const row of [...output.admins||[],...output.tickets||[],...output.suggestions||[]]) {
    const key=row.telegram_id||row.chat_id
    if(key&&!known.has(String(key))) {users.push({telegram_id:String(key),username:null,first_name:null,last_name:null,phone:null,is_tester:false,created_at:row.created_at||new Date(0).toISOString()});known.add(String(key));added.push(String(key))}
  }
  for(const ticket of output.tickets||[]) {
    const seats=(output.ticket_seats||[]).filter(s=>String(s.ticket_id)===String(ticket.id))
    check(!seats.length||seats.length===ticket.ticket_count,`Partial seat set on ticket ${ticket.id}; reconcile before migrating`)
  }
  return {tables:output,placeholderUsers:added}
}
export async function targetPlan(db,snapshot) {
  const mapped=mappedRows(snapshot),columns={}
  for(const name of domainTables) {
    columns[name]=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",[name])).rows.map(x=>x.column_name)
    check(columns[name].length,`Run schema migrations first: ${name}`)
    for(const row of mapped.tables[name]||[])for(const key of Object.keys(row))check(columns[name].includes(key),`Unmapped source column: ${name}.${key}`)
  }
  return {...mapped,columns}
}
function normalized(value) {
  if(value instanceof Date)return value.toISOString()
  if(Array.isArray(value))return value.map(normalized)
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,normalized(v)]))
  return typeof value==='number'?String(value):value
}
export async function verifyTarget(db,snapshot,uploadDir) {
  const mapped=await targetPlan(db,snapshot),report={tables:{},files:0,placeholderUsers:mapped.placeholderUsers.length}
  for(const name of domainTables) {
    const expected=mapped.tables[name]||[],actual=(await db.query(`SELECT * FROM "${name}"`)).rows,keys=primaryKeys[name]||['id']
    check(actual.length===expected.length,`Target count differs: ${name}`)
    const identity=row=>keys.map(k=>String(row[k])).join(':')
    const byKey=new Map(actual.map(row=>[identity(row),row]))
    for(const row of expected) {
      const target=byKey.get(identity(row));check(target,`Target record missing: ${name}`)
      for(const [key,value]of Object.entries(row))check(JSON.stringify(normalized(target[key]))===JSON.stringify(normalized(value)),`Target value differs: ${name}.${key} at ${identity(row)}`)
    }
    report.tables[name]=expected.length
  }
  for(const file of snapshot.manifest.files) {
    const buffer=await readFile(safePath(uploadDir,file.bucket,file.key))
    check(sha256(buffer)===file.sha256,`Target file differs: ${file.bucket}/${file.key}`);report.files++
  }
  return report
}

export async function importSnapshot(db,snapshot,uploadDir) {
  const plan=await targetPlan(db,snapshot)
  await db.transaction(async client=>{
    await client.query(`LOCK TABLE ${domainTables.map(x=>`"${x}"`).join(',')} IN ACCESS EXCLUSIVE MODE`)
    for(const name of [...domainTables,'sessions','deliveries','login_challenges','telegram_updates'])check(Number((await client.query(`SELECT count(*) AS total FROM "${name}"`)).rows[0].total)===0,`Target is not empty: ${name}`)
    for(const file of snapshot.manifest.files) {
      const target=safePath(uploadDir,file.bucket,file.key)
      const source=safePath(snapshot.directory,file.bucket,file.key)
      const bytes=await readFile(source)
      check(sha256(bytes)===file.sha256,`Snapshot file checksum mismatch: ${file.bucket}/${file.key}`)
      await mkdir(path.dirname(target),{recursive:true})
      try{await writeFile(target,bytes,{flag:'wx',mode:0o600})}catch(error){if(error.code!=='EEXIST'||sha256(await readFile(target))!==file.sha256)throw error}
    }
    for(const name of domainTables)for(const row of plan.tables[name]||[]) {
      const keys=Object.keys(row)
      await client.query(`INSERT INTO "${name}"(${keys.map(x=>`"${x}"`).join(',')}) VALUES(${keys.map((_,i)=>`$${i+1}`).join(',')})`,Object.values(row))
    }
    for(const name of ['tickets','suggestions','news','programs','gallery','broadcasts'])await client.query(`SELECT setval(pg_get_serial_sequence('${name}','id'),COALESCE((SELECT max(id) FROM "${name}"),0)+1,false)`)
    await client.query("SELECT setval('ticket_number_seq',GREATEST(COALESCE((SELECT max(ticket_number) FROM tickets),0)+1,100000),false)")
  })
  return verifyTarget(db,snapshot,uploadDir)
}
