import { readFile, writeFile, mkdir, readdir, cp } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(new URL('../server/package.json',import.meta.url)),sharp=require('sharp')
const artifacts=path.join(root,'.local/ios-native-refresh/artifacts'),device=JSON.parse(await readFile(path.join(artifacts,'SIMULATOR.json'),'utf8'))
const run=(await readdir(path.join(artifacts,'maestro'))).find(name=>/^2026-/.test(name))
const input=path.join(artifacts,'maestro',run,'ios-store/takeScreenshot'),out=path.join(root,'releases/store-images-20261029')
const records=[]
for(const name of ['01-home','02-program','03-saved','04-news','05-gallery','06-venue']) {
  const bytes=await readFile(path.join(input,`${name}.png`)),meta=await sharp(bytes).metadata()
  assert.ok([[1260,2736],[1290,2796],[1320,2868]].some(([w,h])=>w===meta.width&&h===meta.height),'Unexpected iPhone screenshot size')
  const rgba=await sharp(bytes).ensureAlpha().raw().toBuffer();for(let i=3;i<rgba.length;i+=4)assert.equal(rgba[i],255,'Screenshot has non-opaque pixels; do not silently composite it')
  const folder=`ios-iphone-${meta.width}x${meta.height}`,target=path.join(out,folder,`${name}.png`);await mkdir(path.dirname(target),{recursive:true})
  await sharp(bytes).removeAlpha().keepMetadata().png().toFile(target)
  assert.ok((await sharp(bytes).removeAlpha().raw().toBuffer()).equals(await sharp(target).removeAlpha().raw().toBuffer()),'Displayed RGB pixels changed')
  assert.equal((await sharp(target).metadata()).channels,3)
  records.push({file:folder+'/'+name+'.png',device:device.device,width:meta.width,height:meta.height,channels:3,alphaRemovedWithoutRGBChange:true,sha256:createHash('sha256').update(await readFile(target)).digest('hex')})
}
await cp(path.join(root,'releases/google-play-1.0.1/screenshots/phone'),path.join(out,'android-phone-1080x1920'),{recursive:true})
const android=[]
for(const name of (await readdir(path.join(out,'android-phone-1080x1920'))).filter(name=>name.endsWith('.png'))) {
  const file=path.join(out,'android-phone-1080x1920',name),data=await readFile(file),meta=await sharp(data).metadata()
  assert.equal(meta.width,1080);assert.equal(meta.height,1920);assert.equal(meta.channels,3)
  assert.ok(data.equals(await readFile(path.join(root,'releases/google-play-1.0.1/screenshots/phone',name))))
  android.push({file:'android-phone-1080x1920/'+name,width:1080,height:1920,channels:3,sha256:createHash('sha256').update(data).digest('hex')})
}
assert.equal(android.length,6)
await writeFile(path.join(out,'ANDROID-SCREENSHOTS.json'),JSON.stringify({source:'Frozen real native Android store captures; same guest screen UI as the icon correction',files:android},null,2)+'\n')
await writeFile(path.join(out,'IOS-SCREENSHOTS.json'),JSON.stringify({buildId:'2c018744-3299-458a-93a1-9f7634164c4e',productionBuildId:'950ba344-a3d9-4b5b-a1ee-fde6e918ccf1',source:'Actual native iOS Simulator; same guest assets as production, separately compiled simulator binary',device:device.device,xcode:device.xcode,files:records,consoleDisplayLabelVerified:false},null,2)+'\n')
await writeFile(path.join(out,'UPLOAD-FOLDERS.txt'),`Yashil Uyim store screenshots\n\niOS: ${records[0].file.split('/')[0]} — six actual ${device.device} native Simulator screenshots, ${records[0].width}×${records[0].height}, RGB PNG. Captured by Maestro from the compiled app. Every source pixel was opaque; only the alpha channel was removed. Decoded RGB values were checked identical.\n\nAndroid: android-phone-1080x1920 — six genuine phone screenshots copied from the frozen Android store package. These cover the same guest screens; the icon correction did not change those screens.\n\nUpload iOS images under App Previews and Screenshots, in the iPhone slot accepting these exact dimensions. Current Apple published specifications accept this size for large Dynamic Island iPhones. The console's current label was not independently read because browser automation stopped. Do not put portrait screenshots in Header Assets. This release targets iPhone only; no iPad screenshots are supplied.\n\nInspect each image before uploading. The publisher uploads first-release images and submits the initial review. No image was uploaded by this script.\n`)
const zip=path.join(root,'releases/yashil-uyim-native-store-screenshots-20261029.zip')
const r=spawnSync('pwsh.exe',['-NoProfile','-Command','Compress-Archive -LiteralPath $env:YASHILUYIM_IMAGES -DestinationPath $env:YASHILUYIM_IMAGES_ZIP -Force -CompressionLevel Optimal'],{env:{...process.env,YASHILUYIM_IMAGES:out,YASHILUYIM_IMAGES_ZIP:zip},stdio:'inherit'})
if(r.status!==0)throw new Error('Screenshot ZIP failed')
console.log(`Six genuine iOS screenshots verified as opaque RGB without pixel changes. Upload package: ${zip}`)
