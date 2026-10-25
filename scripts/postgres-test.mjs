import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'

const name=`yashiluyim-local-qa-${randomBytes(6).toString('hex')}`,password=randomBytes(24).toString('hex')
const docker=(args,options={})=>spawnSync('docker',args,{encoding:'utf8',...options})
let started=false
try {
  console.log('Starting a disposable local PostgreSQL 17 test container; no application build is performed.')
  const result=docker(['run','--detach','--rm','--name',name,'--env','POSTGRES_USER=yu_test_runner','--env',`POSTGRES_PASSWORD=${password}`,'--publish','127.0.0.1::5432','postgres:17-alpine'])
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
  const resultTests=spawnSync(process.execPath,['--test','--test-concurrency=1','server/test/app.test.js','server/test/migration.test.js'],{
    stdio:'inherit',env:{...process.env,TEST_POSTGRES_ADMIN_URL:`postgresql://yu_test_runner:${password}@${published}/postgres`},
  })
  process.exitCode=resultTests.status||0
}finally{
  if(started&&/^yashiluyim-local-qa-[a-f0-9]{12}$/.test(name))docker(['stop',name])
}
