import { readFile, writeFile, access } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const platform=process.argv[2]
const mode=process.argv[3]||'public'
if(!['android','ios'].includes(platform)||!['public','vps'].includes(mode)||process.argv.length>4)throw new Error('Use npm run mobile:init -- android|ios public|vps (default: public)')
if(platform==='ios'&&process.platform!=='darwin')throw new Error('iOS project generation requires macOS/Xcode')
await access(`${mode==='public'?'dist-public':'dist-vps'}/index.html`).catch(()=>{throw new Error('Build the selected isolated mobile bundle first. This command never builds it for you.')})
const cli=path.resolve('node_modules/@capacitor/cli/bin/capacitor')
const result=spawnSync(process.execPath,[cli,'add',platform],{stdio:'inherit',env:{...process.env,YASHILUYIM_MOBILE_MODE:mode}})
if(result.status!==0)process.exit(result.status??1)
if(mode==='public'){console.log('Public native project prepared without camera/login plugins. Signing and device verification are still required.');process.exit(0)}
if(platform==='android') {
  const file='android/app/src/main/AndroidManifest.xml'
  let xml=await readFile(file,'utf8')
  if(!xml.includes('android.permission.CAMERA'))xml=xml.replace('</manifest>','    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>')
  await writeFile(file,xml)
}else{
  const file='ios/App/App/Info.plist'
  let xml=await readFile(file,'utf8')
  if(!xml.includes('NSCameraUsageDescription')) {
    const updated=xml.replace(/<\/dict>\s*<\/plist>/,'<key>NSCameraUsageDescription</key><string>Festival chiptalarining QR kodini tekshirish uchun kamera kerak.</string>\n</dict>\n</plist>')
    if(updated===xml)throw new Error('Could not locate the root Info.plist dictionary')
    xml=updated
  }
  await writeFile(file,xml)
}
console.log('Native project prepared. Signing and device verification are still required.')
