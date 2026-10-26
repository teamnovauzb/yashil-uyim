import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { setTimeout } from 'node:timers/promises'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.local/android-native-qa')
const require=createRequire(new URL('../server/package.json',import.meta.url)),sharp=require('sharp')
const sdk=process.env.ANDROID_HOME||path.join(process.env.LOCALAPPDATA,'Android/Sdk'),adb=path.join(sdk,'platform-tools/adb.exe'),serial=process.env.YASHILUYIM_QA_EMULATOR||'emulator-5556'
if(!/^emulator-\d+$/.test(serial))throw new Error('Store capture is restricted to a local emulator, never a physical device')
function run(args,binary=false) {
  const result=spawnSync(adb,['-s',serial,...args],{encoding:binary?undefined:'utf8',maxBuffer:16*1024*1024})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(String(result.stderr)||'ADB failed')
  return result.stdout
}
const [action,label,filename]=process.argv.slice(2),stateFile=path.join(root,`.local/emulator-store-state-${serial}.json`)
if(run(['emu','avd','name']).trim().split(/\r?\n/)[0].trim()!=='YashilUyim_QA')throw new Error('Only the dedicated YashilUyim_QA emulator may be controlled')
await mkdir(out,{recursive:true})
async function capture(name) {
  if(!/^[\w-]+\.png$/.test(name))throw new Error('Use a simple PNG filename')
  const bytes=run(['exec-out','screencap','-p'],true)
  await sharp(bytes).removeAlpha().png().toFile(path.join(out,name))
  console.log(`Captured ${name}`)
}
if(action==='start') {
  const state={size:run(['shell','wm','size']),density:run(['shell','wm','density']),night:run(['shell','cmd','uimode','night'])}
  await writeFile(stateFile,JSON.stringify(state,null,2),{flag:'wx'})
  run(['install','-r',path.join(root,'releases/google-play-1.0.0/yashil-uyim-1.0.0-1.apk')])
  run(['shell','wm','size','1080x1920']);run(['shell','wm','density','420']);run(['shell','cmd','uimode','night','no'])
  run(['shell','am','force-stop','uz.teamnova.yashiluyim']);run(['shell','am','start','-n','uz.teamnova.yashiluyim/.MainActivity'])
  await setTimeout(8000)
  let ready=false
  for(let i=0;i<12;i++) {
    run(['shell','uiautomator','dump','/sdcard/yashiluyim-store-window.xml'])
    const xml=run(['shell','cat','/sdcard/yashiluyim-store-window.xml'])
    if(xml.includes('uz.teamnova.yashiluyim')&&xml.includes('Festival qo')){ready=true;break}
    await setTimeout(1500)
  }
  if(!ready)throw new Error('Guest UI did not become accessible in the emulator')
  await capture('01-home.png')
} else if(action==='screen') {
  let node
  for(let attempt=0;attempt<5;attempt++) {
  run(['shell','uiautomator','dump','/sdcard/yashiluyim-store-window.xml'])
  const xml=run(['shell','cat','/sdcard/yashiluyim-store-window.xml'])
  if(!xml.includes('package="uz.teamnova.yashiluyim"'))throw new Error('Guest app must be foreground for scoped QA actions')
  await writeFile(path.join(root,'.local/store-window.xml'),xml)
  const candidates=[...xml.matchAll(/<node\b[^>]+>/g)].map(match=>match[0])
  node=candidates.filter(node=>[...node.matchAll(/(?:text|content-desc)="([^"]*)"/g)].some(match=>match[1].trim()===label)).filter(node=>{
    const b=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
    return b&&Number(b[3])>Number(b[1])&&Number(b[4])>Number(b[2])&&Number(b[2])<1920
  }).at(-1)
  if(node)break
  run(['shell','input','swipe','540','1450','540','650','300']);await setTimeout(1000)
  }
  if(!node)throw new Error(`Accessible label not found: ${label}; inspect .local/store-window.xml`)
  const bounds=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
  if(!bounds)throw new Error('Control bounds unavailable')
  const [,x1,y1,x2,y2]=bounds.map(Number)
  run(['shell','input','tap',String(Math.round((x1+x2)/2)),String(Math.round((y1+y2)/2))])
  await setTimeout(5000);await capture(filename)
} else if(action==='capture')await capture(filename||label)
else if(action==='finish') {
  const state=JSON.parse(await readFile(stateFile,'utf8'))
  run(['shell','wm','size',state.size.match(/Override size: ([\dx]+)/)?.[1]||'reset'])
  run(['shell','wm','density',state.density.match(/Override density: (\d+)/)?.[1]||'reset'])
  const mode=state.night.toLowerCase().match(/(auto|yes|no|custom)/)?.[1]||'auto'
  run(['shell','cmd','uimode','night',mode])
  console.log('Restored original emulator size, density and night mode')
} else throw new Error('Use start | screen <accessible-label> <filename.png> | capture <filename.png> | finish')
