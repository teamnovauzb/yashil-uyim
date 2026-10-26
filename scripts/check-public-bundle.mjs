import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root=path.resolve(import.meta.dirname,'..'),dir=path.resolve(root,process.env.YASHILUYIM_PUBLIC_BUNDLE_DIR||'dist-public')
const html=await readFile(path.join(dir,'index.html'),'utf8')
if(html.includes('telegram.org'))throw new Error('Telegram SDK must not be in guest HTML')
const scripts=(await readdir(path.join(dir,'assets'))).filter(name=>name.endsWith('.js'))
const code=(await Promise.all(scripts.map(name=>readFile(path.join(dir,'assets',name),'utf8')))).join('\n')
for(const forbidden of ['Telegram orqali kirish','VpsGate','html5-qrcode','cron-cleanup-qrs','/api/auth/start','/api/tickets/checkout'])if(code.includes(forbidden))throw new Error(`Private/legacy module in guest release: ${forbidden}`)
const endpoint=process.env.VITE_PUBLIC_CONTENT_SOURCE==='api'?'/api/public/content':'/rest/v1/'
for(const required of ['pub-program','/maxfiylik',endpoint])if(!code.includes(required))throw new Error(`Expected guest release capability missing: ${required}`)
if(!/credentials\s*:\s*["'`]omit["'`]/.test(code))throw new Error('Public requests must omit user cookies')
console.log('Production guest entry verified: public UI/REST/privacy included; legacy auth/admin/ticket entry excluded')
