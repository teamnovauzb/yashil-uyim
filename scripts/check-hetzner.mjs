import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { localDockerEnv } from './local-docker.mjs'

const root=fileURLToPath(new URL('../',import.meta.url))
const dockerEnv=localDockerEnv()
const parent=path.join(root,'.local')
await mkdir(parent,{recursive:true})
const output=await mkdtemp(path.join(parent,'hetzner-config-'))
if(!output.startsWith(path.join(parent,'hetzner-config-')))throw new Error('Unexpected validation directory')
function run(command,args) {
  const result=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024,env:command==='docker'?dockerEnv:process.env})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(result.stderr||result.stdout||`${command} failed`)
  return (result.stdout||'')+(result.stderr||'')
}
try {
  console.log('Local configuration validation only. No SSH, application build, or server installation.')
  run(process.execPath,['deploy/hetzner/render.mjs','yashiluyim.test',output])
  const certs=path.join(output,'certs');await mkdir(certs)
  const windowsOpenSSL='C:/Program Files/Git/usr/bin/openssl.exe'
  const openssl=process.platform==='win32'&&existsSync(windowsOpenSSL)?windowsOpenSSL:'openssl'
  run(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=yashiluyim.test','-keyout',path.join(certs,'privkey.pem'),'-out',path.join(certs,'fullchain.pem')])
  for(const mode of ['http','tls']) {
    const result=run('docker',['run','--rm','--entrypoint','nginx','--mount',`type=bind,source=${path.join(output,`yashiluyim-${mode}.conf`)},target=/etc/nginx/conf.d/yashiluyim.conf,readonly`,'--mount',`type=bind,source=${certs},target=/etc/letsencrypt/live/yashiluyim.test,readonly`,'nginx:1.28-alpine','-t'])
    console.log(`${mode.toUpperCase()} Nginx 1.28 syntax: passed`)
    if(!result.includes('test is successful'))throw new Error('Nginx validation did not confirm success')
  }
  console.log('Checking systemd unit syntax in a disposable Ubuntu 26.04 container (validation tools only).')
  run('docker',['run','--rm','--entrypoint','sh','--mount',`type=bind,source=${path.join(root,'deploy','hetzner')},target=/units,readonly`,'ubuntu:26.04','-ec',
    'export DEBIAN_FRONTEND=noninteractive; apt-get update -qq; apt-get install -y -qq --no-install-recommends systemd >/dev/null; mkdir -p /srv/yashiluyim/current/server /var/lib/yashiluyim/uploads /etc/yashiluyim; touch /etc/yashiluyim/app.env; ln -s /bin/true /usr/bin/node; systemd-analyze verify /units/yashiluyim-api.service /units/yashiluyim-worker.service'])
  console.log('Ubuntu 26.04 systemd unit syntax: passed (services were not started).')
}finally{
  await rm(output,{recursive:true,force:true})
}
