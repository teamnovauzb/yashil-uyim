import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(new URL('../server/package.json',import.meta.url)),sharp=require('sharp')
const out=process.env.YASHILUYIM_RELEASE_DIR
if(!out)throw new Error('Release directory required')
const script='$taskZip=[IO.Compression.ZipFile]::OpenRead($env:YASHILUYIM_BRANDING_AAB);try{$taskItems=@(foreach($taskEntry in $taskZip.Entries){if($taskEntry.FullName -match "^base/res/mipmap-(mdpi|hdpi|xhdpi|xxhdpi|xxxhdpi)-v4/ic_launcher(_round|_foreground)?[.]png$"){$taskStream=[IO.MemoryStream]::new();$taskReader=$taskEntry.Open();try{$taskReader.CopyTo($taskStream);@{name=$taskEntry.FullName;data=[Convert]::ToBase64String($taskStream.ToArray())}}finally{$taskReader.Dispose();$taskStream.Dispose()}}});ConvertTo-Json -InputObject $taskItems -Compress}finally{$taskZip.Dispose()}'
const aab=path.join(out,`yashil-uyim-${process.env.YASHILUYIM_VERSION_NAME}-${process.env.YASHILUYIM_VERSION_CODE}.aab`)
const result=spawnSync(process.env.YASHILUYIM_POWERSHELL||'pwsh.exe',['-NoProfile','-Command',script],{encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env,YASHILUYIM_BRANDING_AAB:aab}})
if(result.status!==0)throw new Error('Cannot inspect bundled launcher artwork')
const entries=JSON.parse(result.stdout),logo=await readFile(path.join(root,process.env.YASHILUYIM_ICON_SOURCE))
if(entries.length!==15)throw new Error('Expected launcher artwork in every density')
async function equal(actual,expected) {
  const a=await sharp(actual).ensureAlpha().raw().toBuffer(),b=await sharp(expected).ensureAlpha().raw().toBuffer()
  if(!a.equals(b))throw new Error('Bundled launcher/store artwork differs from supplied logo')
}
const sizes={mdpi:[48,108],hdpi:[72,162],xhdpi:[96,216],xxhdpi:[144,324],xxxhdpi:[192,432]}
for(const entry of entries) {
  const density=entry.name.match(/mipmap-([^-]+)/)[1],foreground=entry.name.includes('_foreground')
  const [size,adaptive]=sizes[density],inset=Math.floor(adaptive*.15)
  const expected=foreground?await sharp(logo).resize(adaptive-inset*2,adaptive-inset*2).extend({top:inset,bottom:inset,left:inset,right:inset,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer():await sharp(logo).resize(size,size).flatten({background:'#ffffff'}).png().toBuffer()
  await equal(Buffer.from(entry.data,'base64'),expected)
}
await equal(await readFile(path.join(out,'graphics/app-icon-512.png')),await sharp(logo).resize(512,512).flatten({background:'#ffffff'}).ensureAlpha().png().toBuffer())
await writeFile(path.join(out,'BRANDING-VERIFICATION.json'),JSON.stringify({logo:process.env.YASHILUYIM_ICON_SOURCE,bundledLauncherImagesVerified:entries.length,storeIconMatchesSameSource:true,method:'Decoded pixel comparison against supplied logo at every launcher density; store icon compared to the same source'},null,2)+'\n')
console.log('All 15 bundled launcher images and the 512px store icon match the supplied globe-house logo')
