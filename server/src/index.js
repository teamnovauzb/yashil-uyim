import { configFromEnv } from './config.js'
import { createDb } from './db.js'
import { buildApp } from './app.js'

const config=configFromEnv(),db=createDb(config.databaseUrl)
const app=await buildApp({db,config,logger:true})
app.addHook('onClose',()=>db.close())
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{await app.close();process.exit(0)})
await app.listen({host:config.host,port:config.port})
