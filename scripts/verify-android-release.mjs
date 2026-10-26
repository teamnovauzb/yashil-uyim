import { spawnSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(process.env.YASHILUYIM_RELEASE_DIR||path.join(root,'releases/google-play-1.0.0')),logs=path.join(root,'.local/release-verification')
const versionName=process.env.YASHILUYIM_VERSION_NAME||'1.0.0',versionCode=Number(process.env.YASHILUYIM_VERSION_CODE||1)
const java=process.env.JAVA_HOME||'C:/Program Files/Android/Android Studio/jbr',sdk=process.env.ANDROID_HOME||path.join(process.env.LOCALAPPDATA,'Android/Sdk')
const aab=path.join(out,`yashil-uyim-${versionName}-${versionCode}.aab`),apk=path.join(out,`yashil-uyim-${versionName}-${versionCode}.apk`)
await mkdir(logs,{recursive:true})
async function run(name,command,args) {
  const result=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,JAVA_HOME:java}})
  await writeFile(path.join(logs,`${name}.log`),(result.stdout||'')+(result.stderr||''))
  if(result.error||result.status!==0)throw new Error(`${name} failed; inspect the local verification log`)
  return result.stdout||''
}
await run('bundletool',path.join(java,'bin/java.exe'),['-jar',path.join(root,'.local/tools/bundletool.jar'),'validate',`--bundle=${aab}`])
const jar=await run('aab-signature',path.join(java,'bin/jarsigner.exe'),['-verify',aab])
if(!jar.includes('jar verified.'))throw new Error('AAB signature verification did not confirm success')
const apkSignature=await run('apk-signature',path.join(java,'bin/java.exe'),['-jar',path.join(sdk,'build-tools/36.0.0/lib/apksigner.jar'),'verify','--verbose','--print-certs',apk])
if(!apkSignature.includes('Verifies'))throw new Error('APK signature verification did not confirm success')
const badging=await run('manifest',path.join(sdk,'build-tools/36.0.0/aapt.exe'),['dump','badging',apk])
for(const expected of ["name='uz.teamnova.yashiluyim'",`versionCode='${versionCode}'`,`versionName='${versionName}'`,"sdkVersion:'24'","targetSdkVersion:'36'"])if(!badging.includes(expected))throw new Error('Unexpected Android release identity/SDK')
const permissions=[...badging.matchAll(/uses-permission: name='([^']+)'/g)].map(match=>match[1])
const allowed=['android.permission.INTERNET','uz.teamnova.yashiluyim.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION']
if(permissions.some(permission=>!allowed.includes(permission))||badging.includes('application-debuggable'))throw new Error('Unexpected permission or debuggable release')
const entries=await run('entries',path.join(java,'bin/jar.exe'),['tf',aab])
if(process.env.YASHILUYIM_OBFUSCATION==='true'&&!entries.includes('BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map'))throw new Error('The AAB is missing its R8 deobfuscation metadata')
const nativeLibraries=entries.split(/\r?\n/).filter(entry=>entry.endsWith('.so'))
if(nativeLibraries.length)throw new Error('Native libraries require a separate page-size/alignment check')
const hashes={}
for(const file of [aab,apk])hashes[path.basename(file)]=createHash('sha256').update(await readFile(file)).digest('hex')
const report={package:'uz.teamnova.yashiluyim',version:versionName,versionCode,minSdk:24,targetSdk:36,bundletool:'passed',aabSignature:'verified',apkSignature:'verified',permissions,debuggable:false,nativeLibraries:0,appIconSource:process.env.YASHILUYIM_ICON_SOURCE||'Existing public/landing.png eco-tree; user selected',r8MappingBundled:process.env.YASHILUYIM_OBFUSCATION==='true',hashes}
await writeFile(path.join(out,'BUILD-VERIFICATION.json'),JSON.stringify(report,null,2)+'\n')
console.log('AAB structure/signature and APK signature verified; correct package/version/API 36; no sensitive permissions, debug flag, or bundled native libraries')
