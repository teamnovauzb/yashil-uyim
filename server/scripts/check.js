import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

async function walk(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const target=path.join(dir,entry.name)
    if(entry.isDirectory())await walk(target)
    else if(entry.name.endsWith('.js')) {
      const result=spawnSync(process.execPath,['--check',target],{stdio:'inherit'})
      if(result.status!==0)process.exit(result.status||1)
    }
  }
}
for(const dir of ['src','scripts','test'])await walk(fileURLToPath(new URL(`../${dir}/`,import.meta.url)))
console.log('Server JavaScript syntax checks passed')
