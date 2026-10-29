import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
if(process.platform!=='darwin')throw new Error('iOS Simulator build/capture requires a Mac with Xcode. Android/browser previews are not iOS submission screenshots.')
const root=path.resolve(import.meta.dirname,'..'),[action,name]=process.argv.slice(2)
if(!['build','capture'].includes(action)||(action==='capture'&&!/^[a-z0-9-]+$/.test(name||'')))throw new Error('Use ios-simulator.mjs build | capture 01-home')
function run(command,args,capture=false) {
  const result=spawnSync(command,args,{cwd:root,encoding:'utf8',...(capture?{}:{stdio:'inherit'})})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`${command} failed`)
  return result.stdout?.trim()
}
const release=JSON.parse(await readFile(path.join(root,'store/app-store/release.json'),'utf8'))
const devices=Object.values(JSON.parse(run('xcrun',['simctl','list','devices','--json'],true)).devices).flat()
const booted=devices.filter(device=>device.state==='Booted'&&device.isAvailable&&device.name.startsWith('iPhone'))
const device=process.env.IOS_SIMULATOR_UDID?booted.find(d=>d.udid===process.env.IOS_SIMULATOR_UDID):booted.length===1?booted[0]:undefined
if(!device)throw new Error('Boot one iPhone Simulator in Xcode, or set IOS_SIMULATOR_UDID to the booted iPhone you intend to use')
const derived=path.join(root,'build-output/ios-simulator')
if(action==='build') {
  run('xcodebuild',['-project','ios/App/App.xcodeproj','-scheme','App','-configuration','Debug','-sdk','iphonesimulator','-destination',`id=${device.udid}`,'-derivedDataPath',derived,'CODE_SIGNING_ALLOWED=NO','build'])
  run('xcrun',['simctl','install',device.udid,path.join(derived,'Build/Products/Debug-iphonesimulator/App.app')])
  run('xcrun',['simctl','launch',device.udid,release.bundleId])
  console.log('Simulator app installed and launched. Check all tabs, bookmarks, offline text, media, map, privacy, safe areas and keyboard before archiving.')
} else {
  const out=path.join(root,`screenshots/ios-${release.version}`);await mkdir(out,{recursive:true})
  const file=path.join(out,`${name}.png`)
  run('xcrun',['simctl','io',device.udid,'screenshot','--type=png',file])
  const upload=path.join(out,`${name}.jpg`)
  run('sips',['-s','format','jpeg','-s','formatOptions','100',file,'--out',upload])
  const dimensions=run('sips',['-g','pixelWidth','-g','pixelHeight',upload],true)
  const width=Number(dimensions.match(/pixelWidth:\s+(\d+)/)?.[1]),height=Number(dimensions.match(/pixelHeight:\s+(\d+)/)?.[1])
  const largeDisplayAccepted=[[1260,2736],[1290,2796],[1320,2868]].some(([w,h])=>width===w&&height===h)
  await writeFile(path.join(out,`${name}.json`),JSON.stringify({source:'actual iOS Simulator capture',device:device.name,udid:device.udid,original:path.basename(file),uploadFile:path.basename(upload),width,height,largeDisplayAccepted,capturedAt:new Date().toISOString(),note:'Verify the intended app screen is visible; compare dimensions with the current App Store Connect requirements'},null,2)+'\n')
  console.log(`Captured ${file}; opaque JPEG for upload: ${upload}. Large-display size recognised: ${largeDisplayAccepted}. Navigate to the next actual app screen before capturing again.`)
}
