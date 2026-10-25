import { setTimeout } from 'node:timers/promises'
import { configFromEnv } from './config.js'
import { createDb } from './db.js'
import { expandBroadcast, processDelivery, telegramClient } from './jobs.js'

const config=configFromEnv(),db=createDb(config.databaseUrl),telegram=telegramClient(config)
if(process.env.ENABLE_TELEGRAM_DELIVERY!=='true')throw new Error('Worker is paused. Set ENABLE_TELEGRAM_DELIVERY=true only after validating the target and bot.')
let running=true
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{running=false})
while(running) {
  try {
    await expandBroadcast(db)
    const worked=await processDelivery(db,config,telegram)
    await db.query("DELETE FROM login_challenges WHERE expires_at<now()-interval '1 day'")
    await db.query("DELETE FROM sessions WHERE expires_at<now()-interval '7 days'")
    await db.query("DELETE FROM telegram_updates WHERE created_at<now()-interval '7 days'")
    await setTimeout(worked?125:1000)
  } catch { console.error('Background job failed; retrying in 5 seconds');await setTimeout(5000) }
}
await db.close()
