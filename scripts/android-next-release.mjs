import { spawnSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { loadEnv } from 'vite'

const root=path.resolve(import.meta.dirname,'..'),args=process.argv.slice(2),qa=args.length===1&&args[0]==='--qa'
const supabaseRelease=args.length===1&&args[0]==='--supabase-release'
if(args.length&&!qa&&!supabaseRelease)throw new Error('Use android:release for VPS, android:release:supabase for the current public source, or android:qa')
const release=JSON.parse(await readFile(path.join(root,'store/google-play/next-release.json'),'utf8'))
if(release.applicationId!=='uz.teamnova.yashiluyim'||!Number.isInteger(release.versionCode)||release.versionCode<2||!/^\d+\.\d+\.\d+$/.test(release.versionName))throw new Error('Invalid next-release identity')
const loaded=loadEnv('public',root,''),env={...process.env}
let source
if(qa||supabaseRelease) {
  source='supabase'
  if(!loaded.VITE_PUBLIC_SUPABASE_URL||!loaded.VITE_PUBLIC_SUPABASE_KEY)throw new Error('Configure the existing public Supabase source')
  Object.assign(env,{VITE_PUBLIC_CONTENT_SOURCE:source,VITE_PUBLIC_SUPABASE_URL:loaded.VITE_PUBLIC_SUPABASE_URL,VITE_PUBLIC_SUPABASE_KEY:loaded.VITE_PUBLIC_SUPABASE_KEY,VITE_PUBLIC_API_URL:''})
} else {
  const value=(process.env.YASHILUYIM_VPS_API_URL||'').replace(/\/$/,'')
  let url
  try {url=new URL(value)}catch{throw new Error('Set YASHILUYIM_VPS_API_URL to the deployed guest API HTTPS origin. Nothing was built or changed.')}
  if(url.protocol!=='https:'||url.origin!==value||url.username||url.password||/SET_THE_|example/i.test(url.hostname))throw new Error('Use the real VPS HTTPS origin, without credentials or a path')
  const response=await fetch(`${value}/api/public/content`,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)})
  if(!response.ok)throw new Error('VPS public content preflight failed; nothing was built')
  const content=await response.json()
  if(content.version!==1||!['programs','news','gallery'].every(key=>Array.isArray(content[key]))||!content.settings)throw new Error('VPS public content contract is invalid; nothing was built')
  source='api'
  Object.assign(env,{VITE_PUBLIC_CONTENT_SOURCE:source,VITE_PUBLIC_API_URL:value,VITE_PUBLIC_SUPABASE_URL:'',VITE_PUBLIC_SUPABASE_KEY:''})
}
const output=path.join(root,qa?`.local/next-release-qa-${release.versionName}`:`releases/google-play-${release.versionName}`)
const profile=qa?'qa':supabaseRelease?'supabase':'vps'
Object.assign(env,{YASHILUYIM_NEXT_PROFILE:profile,YASHILUYIM_RELEASE_DIR:output,YASHILUYIM_VERSION_NAME:release.versionName,YASHILUYIM_VERSION_CODE:String(release.versionCode),YASHILUYIM_OBFUSCATION:'true',YASHILUYIM_MOBILE_MODE:'public',YASHILUYIM_MOBILE_WEB_DIR:'.local/dist-public-next',YASHILUYIM_PUBLIC_BUNDLE_DIR:'.local/dist-public-next',YASHILUYIM_ICON_SOURCE:release.logo})
function run(command,arguments_) {
  const result=spawnSync(command,arguments_,{cwd:root,env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error('Next-release step failed; no upload or deployment was attempted')
}
console.log(qa?'LOCAL QA ONLY: current Supabase source.':supabaseRelease?'Building the icon correction with the current public Supabase source.':'Building the next guest release against the verified VPS API.')
run(process.execPath,['node_modules/vite/bin/vite.js','build','--mode','public','--outDir',env.YASHILUYIM_PUBLIC_BUNDLE_DIR])
run(process.execPath,['scripts/check-public-bundle.mjs'])
run(process.execPath,['scripts/mobile-sync.mjs','public'])
run(process.execPath,['scripts/store-assets.mjs'])
run(process.execPath,['scripts/android-release.mjs'])
run(process.execPath,['scripts/verify-android-release.mjs'])
run(process.env.YASHILUYIM_POWERSHELL||'pwsh.exe',['-NoProfile','-File','scripts/verify-native-assets.ps1'])
run(process.execPath,['scripts/verify-release-branding.mjs'])
await mkdir(output,{recursive:true})
await writeFile(path.join(output,'PROFILE.json'),JSON.stringify({versionName:release.versionName,versionCode:release.versionCode,profile:qa?'local-qa-only':profile,source,readyForVpsUpload:profile==='vps',storeRelease:!qa,logo:release.logo,r8:true,mappingBundled:true},null,2)+'\n')
console.log(qa?'QA artifacts verified in .local only.':`Signed ${profile} release and its exact mapping verified locally. No Play upload or server change performed.`)
