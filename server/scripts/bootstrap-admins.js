import { createDb, audit, check } from '../src/db.js'

check(process.argv.includes('--apply'),'Administrator changes require --apply')
check(process.env.MIGRATION_TARGET_URL,'Set MIGRATION_TARGET_URL explicitly')
const ids=(process.env.BOOTSTRAP_SUPER_ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)
check(ids.length>0&&ids.every(x=>/^[1-9]\d{0,15}$/.test(x)),'Set BOOTSTRAP_SUPER_ADMIN_IDS')
const db=createDb(process.env.MIGRATION_TARGET_URL)
try {
  await db.transaction(async client=>{
    for(const id of ids) {
      await client.query('INSERT INTO users(telegram_id) VALUES($1) ON CONFLICT DO NOTHING',[id])
      await client.query('INSERT INTO admins(telegram_id,is_super) VALUES($1,true) ON CONFLICT(telegram_id) DO UPDATE SET is_super=true',[id])
      await audit(client,null,'bootstrap-super-admin','admins',id)
    }
  })
  console.log(`Configured ${ids.length} super administrator(s)`)
} finally{await db.close()}
