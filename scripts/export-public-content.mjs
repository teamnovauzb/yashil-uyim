import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'dotenv'
import { publicSourceConfig, readPublicSource } from '../server/src/public-source.js'

const [sourceEnv,output,...extra]=process.argv.slice(2)
if(!sourceEnv||!output||extra.length)throw new Error('Use node scripts/export-public-content.mjs <source-env-file> <output-json>')
const env=parse(await readFile(sourceEnv))
const config=publicSourceConfig({PUBLIC_CONTENT_SOURCE:'supabase',GUEST_SUPABASE_URL:env.VITE_SUPABASE_URL,GUEST_SUPABASE_PUBLIC_KEY:env.VITE_SUPABASE_ANON_KEY})
const content=await readPublicSource(config)
const destination=path.resolve(output)
await mkdir(path.dirname(destination),{recursive:true})
await writeFile(destination,JSON.stringify(content,null,2)+'\n')
console.log(JSON.stringify({programs:content.programs.length,news:content.news.length,gallery:content.gallery.length,venueFields:Object.keys(content.settings).length,output:destination}))
