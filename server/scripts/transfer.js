import path from 'node:path'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { createDb, check } from '../src/db.js'
import { safePath } from '../src/storage.js'
import { domainTables, identity, sha256, writeJson, loadSnapshot, targetPlan, verifyTarget, importSnapshot } from './transfer-lib.js'

const command=process.argv[2],directory=path.resolve(process.env.SNAPSHOT_DIR||'./backups/migration')
check(['export','import','verify'].includes(command),'Use export, import, or verify')
if(command==='export') {
  check(process.env.SOURCE_DATABASE_URL&&process.env.SOURCE_SUPABASE_URL&&process.env.SOURCE_STORAGE_KEY,'Set explicit SOURCE_DATABASE_URL, SOURCE_SUPABASE_URL, and SOURCE_STORAGE_KEY')
  const origin=new URL(process.env.SOURCE_SUPABASE_URL).origin
  check(origin.startsWith('https://'),'Source storage must use HTTPS')
  try{await access(directory);throw new Error('Snapshot directory already exists; use a new directory')}catch(error){if(error.code!=='ENOENT')throw error}
  await mkdir(directory,{recursive:true,mode:0o700})
  const db=createDb(process.env.SOURCE_DATABASE_URL)
  try {
    await db.transaction(async client=>{
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
      const existing=(await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows.map(x=>x.table_name)
      const manifest={version:1,created_at:new Date().toISOString(),source_identity:identity(process.env.SOURCE_DATABASE_URL),storage_origin:origin,unknown_tables:existing.filter(x=>!domainTables.includes(x)&&x!=='_prisma_migrations'),tables:{},files:[]}
      for(const name of domainTables) {
        if(!existing.includes(name))continue
        const rows=(await client.query(`SELECT * FROM "${name}"`)).rows
        await writeJson(path.join(directory,`${name}.json`),rows)
        manifest.tables[name]={rows:rows.length,sha256:sha256(await readFile(path.join(directory,`${name}.json`)))}
      }
      const objects=(await client.query("SELECT bucket_id,name FROM storage.objects WHERE bucket_id IN ('media','receipts') ORDER BY bucket_id,name")).rows
      for(const object of objects) {
        const target=safePath(path.join(directory,'files'),object.bucket_id,object.name)
        const url=`${origin}/storage/v1/object/authenticated/${object.bucket_id}/${object.name.split('/').map(encodeURIComponent).join('/')}`
        const response=await fetch(url,{headers:{apikey:process.env.SOURCE_STORAGE_KEY,Authorization:`Bearer ${process.env.SOURCE_STORAGE_KEY}`},signal:AbortSignal.timeout(120000)})
        check(response.ok,`Storage download failed (${response.status}); snapshot is incomplete`)
        const bytes=Buffer.from(await response.arrayBuffer())
        await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes,{mode:0o600,flag:'wx'})
        manifest.files.push({bucket:object.bucket_id,key:object.name,bytes:bytes.length,sha256:sha256(bytes)})
      }
      // The manifest is written last: incomplete exports cannot be imported.
      await writeJson(path.join(directory,'manifest.json'),manifest)
      console.log(JSON.stringify({tables:Object.fromEntries(Object.entries(manifest.tables).map(([k,v])=>[k,v.rows])),files:manifest.files.length,unknownTables:manifest.unknown_tables},null,2))
    })
  } finally{await db.close()}
} else {
  check(process.env.MIGRATION_TARGET_URL,'Set MIGRATION_TARGET_URL explicitly; DATABASE_URL is not used')
  const snapshot=await loadSnapshot(directory)
  check(identity(process.env.MIGRATION_TARGET_URL)!==snapshot.manifest.source_identity,'Target cannot be the source database')
  const db=createDb(process.env.MIGRATION_TARGET_URL),uploads=path.resolve(process.env.UPLOAD_DIR||'./uploads')
  try {
    if(command==='verify')console.log(JSON.stringify(await verifyTarget(db,snapshot,uploads),null,2))
    else {
      const plan=await targetPlan(db,snapshot)
      console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'dry-run',tables:Object.fromEntries(domainTables.map(t=>[t,plan.tables[t]?.length||0])),files:snapshot.manifest.files.length,placeholderUsers:plan.placeholderUsers.length},null,2))
      if(process.argv.includes('--apply')) {
        console.log(JSON.stringify(await importSnapshot(db,snapshot,uploads),null,2))
      }
    }
  } finally{await db.close()}
}
