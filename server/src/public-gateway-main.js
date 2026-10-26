import { publicSourceConfig } from './public-source.js'
import { buildPublicGateway } from './public-gateway.js'

const config=publicSourceConfig()
const origins=new Set((process.env.GUEST_ALLOWED_ORIGINS||'https://localhost,capacitor://localhost').split(',').map(x=>x.trim()).filter(Boolean))
const port=Number(process.env.GUEST_PORT||3002)
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid GUEST_PORT')
const app=await buildPublicGateway({config,origins,logger:true})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0)})
await app.listen({host:process.env.GUEST_HOST||'127.0.0.1',port})
