import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'dotenv'
import { publicColumns, publicSettingKeys, publishContent } from '../server/src/public-content.js'

const [sourceEnv,output,...extra]=process.argv.slice(2)
if(!sourceEnv||!output||extra.length)throw new Error('Use node scripts/export-public-content.mjs <source-env-file> <output-json>')
const env=parse(await readFile(sourceEnv)),origin=new URL(env.VITE_SUPABASE_URL).origin,key=env.VITE_SUPABASE_ANON_KEY
if(!origin.startsWith('https://')||!key)throw new Error('Source must provide an HTTPS Supabase URL and anonymous read key')
async function get(table,query) {
  const response=await fetch(`${origin}/rest/v1/${table}?${query}`,{method:'GET',headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(20000)})
  if(!response.ok)throw new Error(`Public ${table} read failed (${response.status}); no content file was written`)
  const rows=await response.json()
  if(!Array.isArray(rows))throw new Error(`Invalid public ${table} response`)
  return rows
}
const data={}
for(const table of Object.keys(publicColumns)) data[table]=await get(table,`select=${publicColumns[table].join(',')}&limit=1000`)
data.settings=await get('settings',`select=key,value&key=in.(${publicSettingKeys.join(',')})`)
const content=publishContent(data)
const destination=path.resolve(output)
await mkdir(path.dirname(destination),{recursive:true})
await writeFile(destination,JSON.stringify(content,null,2)+'\n')
console.log(JSON.stringify({programs:content.programs.length,news:content.news.length,gallery:content.gallery.length,venueFields:Object.keys(content.settings).length,output:destination}))
