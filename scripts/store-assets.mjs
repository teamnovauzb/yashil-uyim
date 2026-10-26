import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require=createRequire(new URL('../server/package.json',import.meta.url)),sharp=require('sharp')
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(root,process.env.YASHILUYIM_RELEASE_DIR||'releases/google-play-1.0.1')
await mkdir(path.join(out,'graphics'),{recursive:true})
// The publisher supplied the actual globe-house logo after submitting version 1. Preserve its artwork.
const iconPath=process.env.YASHILUYIM_ICON_SOURCE||'assets/mobile/logo.jpg',icon=await readFile(path.join(root,iconPath)),mime=iconPath.endsWith('.jpg')?'image/jpeg':'image/png'
await sharp(icon).resize(512,512).flatten({background:'#ffffff'}).ensureAlpha().png().toFile(path.join(out,'graphics/app-icon-512.png'))
const feature=(await readFile(path.join(root,'assets/mobile/feature-graphic.svg'),'utf8')).replace('@@BRAND_IMAGE@@',`data:${mime};base64,${icon.toString('base64')}`).replaceAll('#f8f4ec','#ffffff')
await sharp(Buffer.from(feature)).removeAlpha().png().toFile(path.join(out,'graphics/feature-graphic-1024x500.png'))
const res=path.join(root,'android/app/src/main/res')
for(const [density,size,adaptive]of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]) {
  const dir=path.join(res,`mipmap-${density}`);await mkdir(dir,{recursive:true})
  for(const name of ['ic_launcher.png','ic_launcher_round.png'])await sharp(icon).resize(size,size).flatten({background:'#ffffff'}).png().toFile(path.join(dir,name))
  const inset=Math.floor(adaptive*.15),inner=adaptive-inset*2
  await sharp(icon).resize(inner,inner).extend({top:inset,bottom:inset,left:inset,right:inset,background:{r:0,g:0,b:0,alpha:0}}).png().toFile(path.join(dir,'ic_launcher_foreground.png'))
}
await mkdir(path.join(res,'values'),{recursive:true});await mkdir(path.join(res,'mipmap-anydpi-v26'),{recursive:true})
await writeFile(path.join(res,'values/ic_launcher_background.xml'),'<resources><color name="ic_launcher_background">#FFFFFF</color></resources>\n')
for(const name of ['ic_launcher','ic_launcher_round'])await writeFile(path.join(res,`mipmap-anydpi-v26/${name}.xml`),'<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/><monochrome android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n')
await mkdir(path.join(res,'drawable'),{recursive:true})
await unlink(path.join(res,'drawable/ic_launcher_monochrome.xml')).catch(error=>{if(error.code!=='ENOENT')throw error})
console.log('Next-release graphics and Android launcher resources generated using the supplied actual logo')
