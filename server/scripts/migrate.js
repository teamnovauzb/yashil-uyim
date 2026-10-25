import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createDb } from '../src/db.js'

export async function migrateDatabase(db) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())')
  const directory=new URL('../migrations/',import.meta.url)
  for(const name of (await readdir(directory)).filter(x=>/^\d+.*\.sql$/.test(x)).sort()) {
    const sql=await readFile(new URL(name,directory),'utf8'),hash=createHash('sha256').update(sql).digest('hex')
    await db.transaction(async client=>{
      await client.query('LOCK TABLE schema_migrations IN EXCLUSIVE MODE')
      const previous=(await client.query('SELECT sha256 FROM schema_migrations WHERE name=$1',[name])).rows[0]
      if(previous) {if(previous.sha256!==hash)throw new Error(`Migration checksum mismatch: ${name}`);return}
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)',[name,hash])
    })
  }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url) {
  if(!process.argv.includes('--apply')) throw new Error('Schema changes require --apply and MIGRATION_TARGET_URL')
  if(!process.env.MIGRATION_TARGET_URL)throw new Error('Set MIGRATION_TARGET_URL explicitly; DATABASE_URL is not used')
  const db=createDb(process.env.MIGRATION_TARGET_URL)
  try{await migrateDatabase(db);console.log('Schema migrations applied')}finally{await db.close()}
}
