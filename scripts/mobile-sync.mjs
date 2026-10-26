import { spawnSync } from 'node:child_process'
import path from 'node:path'

const mode=process.argv[2]||'public'
if(!['public','vps'].includes(mode)||process.argv.length>3)throw new Error('Use npm run mobile:sync -- public|vps')
const result=spawnSync(process.execPath,[path.resolve('node_modules/@capacitor/cli/bin/capacitor'),'sync'],{stdio:'inherit',env:{...process.env,YASHILUYIM_MOBILE_MODE:mode}})
if(result.error)throw result.error
process.exitCode=result.status??1
