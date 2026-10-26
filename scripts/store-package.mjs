import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'releases/google-play-1.0.0')
const require=createRequire(new URL('../server/package.json',import.meta.url)),sharp=require('sharp')
for(const locale of ['uz','en']) {
  const data=JSON.parse(await readFile(path.join(root,`store/google-play/listing.${locale}.json`),'utf8'))
  const dir=path.join(out,'listing',data.language);await mkdir(dir,{recursive:true})
  for(const [key,file,limit]of [['title','title.txt',30],['shortDescription','short-description.txt',80],['fullDescription','full-description.txt',4000],['releaseNotes','release-notes.txt',500]]) {
    if([...data[key]].length>limit)throw new Error(`${locale} ${key} exceeds ${limit}`)
    await writeFile(path.join(dir,file),data[key]+'\n')
  }
}
for(const file of ['PRIVACY-POLICY-EN.txt','PLAY-CONSOLE-FIELDS.md','ASSET-ALT-TEXT.txt'])await copyFile(path.join(root,'store/google-play',file),path.join(out,file))
const files=[]
async function walk(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name)
    if(entry.isDirectory())await walk(file)
    else if(!['MANIFEST.json','SHA256SUMS.txt'].includes(entry.name)) {
      if(/\.(jks|keystore)$|password|\.env/i.test(entry.name))throw new Error('Private signing/config file must not enter the release package')
      const data=await readFile(file),item={file:path.relative(out,file).replaceAll('\\','/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')}
      if(file.endsWith('.png')) {
        const meta=await sharp(data).metadata();Object.assign(item,{width:meta.width,height:meta.height,channels:meta.channels})
        if(item.file.startsWith('screenshots/')&&(meta.channels!==3||meta.width!==1080||meta.height!==1920))throw new Error(`Invalid store screenshot ${item.file}`)
        if(item.file==='graphics/app-icon-512.png'&&(meta.width!==512||meta.height!==512||meta.channels!==4||data.length>1048576))throw new Error('Invalid Play icon')
        if(item.file==='graphics/feature-graphic-1024x500.png'&&(meta.width!==1024||meta.height!==500||meta.channels!==3))throw new Error('Invalid Play feature graphic')
      }
      files.push(item)
    }
  }
}
await walk(out)
await writeFile(path.join(out,'MANIFEST.json'),JSON.stringify({package:'uz.teamnova.yashiluyim',versionName:'1.0.0',versionCode:1,source:'current Supabase public REST; later VPS requires a new binary',files},null,2)+'\n')
await writeFile(path.join(out,'SHA256SUMS.txt'),files.map(file=>`${file.sha256}  ${file.file}`).join('\n')+'\n')
console.log(`Prepared ${files.length} release files; listing character counts and PNG sizes checked. Private signing credentials excluded.`)
