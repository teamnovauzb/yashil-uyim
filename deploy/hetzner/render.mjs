import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [domain,destination,...extra]=process.argv.slice(2)
if(extra.length||!domain||!destination||domain.length>253||!domain.includes('.')||!domain.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))||/^\d+(\.\d+){3}$/.test(domain)) {
  throw new Error('Usage: node deploy/hetzner/render.mjs <new-domain> <local-output-directory>')
}
const output=path.resolve(destination)
await mkdir(output,{recursive:true})
for(const mode of ['http','tls']) {
  const template=await readFile(new URL(`nginx-${mode}.conf.template`,import.meta.url),'utf8')
  await writeFile(path.join(output,`yashiluyim-${mode}.conf`),template.replaceAll('@@DOMAIN@@',domain),{flag:'wx'})
}
console.log(`Rendered local Nginx files in ${output}. Nothing was installed or enabled.`)
