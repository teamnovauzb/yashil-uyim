import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'../..')
test('iOS archive refuses an unsupported host or missing signing team before creating build output',()=>{
  const output=path.join(root,'build-output'),before=existsSync(output)?readdirSync(output):[]
  const result=spawnSync(process.execPath,['scripts/ios-archive.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,IOS_TEAM_ID:''}})
  assert.notEqual(result.status,0)
  assert.match(result.stderr,process.platform==='darwin'?/Set IOS_TEAM_ID/:/requires macOS/)
  assert.deepEqual(existsSync(output)?readdirSync(output):[],before)
  assert.doesNotMatch(result.stdout,/archiv|exported|uploaded/i)
})
