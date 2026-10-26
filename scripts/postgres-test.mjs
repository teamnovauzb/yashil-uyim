import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'
import { localDockerEnv } from './local-docker.mjs'

const major=process.argv[2]||'18'
if(!['17','18'].includes(major)||process.argv.length>3)throw new Error('Use npm run test:postgres -- 17|18 (default: 18)')
const name=`yashiluyim-local-qa-${randomBytes(6).toString('hex')}`,password=randomBytes(24).toString('hex')
const dockerEnv=localDockerEnv()
const docker=(args,options={})=>spawnSync('docker',args,{encoding:'utf8',env:dockerEnv,...options})
let started=false
try {
  console.log(`Starting a disposable local PostgreSQL ${major} test container; no application build is performed.`)
  const result=docker(['run','--detach','--rm','--name',name,'--env','POSTGRES_USER=yu_test_runner','--env',`POSTGRES_PASSWORD=${password}`,'--publish','127.0.0.1::5432',`postgres:${major}-alpine`])
  if(result.status!==0)throw new Error(result.stderr||'Could not start local PostgreSQL')
  started=true
  let ready=false
  for(let i=0;i<60;i++) {
    if(docker(['exec',name,'pg_isready','-U','yu_test_runner','-d','postgres']).status===0){ready=true;break}
    await setTimeout(1000)
  }
  if(!ready)throw new Error('Local PostgreSQL did not become ready')
  const published=docker(['port',name,'5432/tcp']).stdout.trim()
  if(!/^127\.0\.0\.1:\d+$/.test(published))throw new Error('Unexpected PostgreSQL port mapping')
  const version=docker(['exec',name,'psql','-XAt','-U','yu_test_runner','-d','postgres','-c','SHOW server_version_num']).stdout.trim()
  if(Math.floor(Number(version)/10000)!==Number(major))throw new Error('Unexpected PostgreSQL test version')
  console.log(`Confirmed server_version_num=${version}`)
  const resultTests=spawnSync(process.execPath,['--test','--test-concurrency=1','server/test/app.test.js','server/test/migration.test.js','server/test/hetzner.test.js'],{
    stdio:'inherit',env:{...dockerEnv,TEST_POSTGRES_CONTAINER:name,TEST_POSTGRES_ADMIN_URL:`postgresql://yu_test_runner:${password}@${published}/postgres`},
  })
  if(resultTests.error)throw resultTests.error
  process.exitCode=resultTests.status??1
}finally{
  if(started&&/^yashiluyim-local-qa-[a-f0-9]{12}$/.test(name))docker(['stop',name])
}
