import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'../..')
const hash=async file=>createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')
test('a missing VPS address refuses the next release without changing the submitted AAB or local source settings',async()=>{
  const files=['releases/google-play-1.0.0/yashil-uyim-1.0.0-1.aab','.env.public.local'].filter(file=>existsSync(path.join(root,file)))
  const before=await Promise.all(files.map(hash))
  const result=spawnSync(process.execPath,['scripts/android-next-release.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,YASHILUYIM_VPS_API_URL:''}})
  assert.notEqual(result.status,0)
  assert.match(result.stderr,/Set YASHILUYIM_VPS_API_URL/)
  assert.doesNotMatch(result.stdout,/Building|Sync|Gradle|generated/)
  assert.deepEqual(await Promise.all(files.map(hash)),before)
})
