import { readFile, writeFile, mkdir, cp, readdir, access, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..'),release=JSON.parse(await readFile(path.join(root,'store/app-store/release.json'),'utf8'))
const cliRequire=createRequire(new URL('../node_modules/@capacitor/cli/package.json',import.meta.url)),plist=cliRequire('plist'),xcode=cliRequire('xcode')
const serverRequire=createRequire(new URL('../server/package.json',import.meta.url)),sharp=serverRequire('sharp')
const out=path.join(root,`releases/app-store-${release.version}`),handoff=path.join(out,'mac-project'),app=path.join(root,'ios/App/App')
const preparation=JSON.parse(await readFile(path.join(out,'PREPARATION.json'),'utf8'))
const info=plist.parse(await readFile(path.join(app,'Info.plist'),'utf8')),privacy=plist.parse(await readFile(path.join(app,'PrivacyInfo.xcprivacy'),'utf8'))
assert.equal(info.CFBundleDisplayName,release.displayName)
assert.equal(info.ITSAppUsesNonExemptEncryption,false)
assert.equal(info.NSAppTransportSecurity.NSAllowsArbitraryLoads,false)
assert.equal(privacy.NSPrivacyTracking,false)
for(const key of Object.keys(info))assert.ok(!key.endsWith('UsageDescription'),`Unexpected permission: ${key}`)
const project=xcode.project(path.join(root,'ios/App/App.xcodeproj/project.pbxproj'));project.parseSync()
const objects=project.hash.project.objects,configs=Object.values(objects.XCBuildConfiguration).filter(value=>value?.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER)
assert.equal(configs.length,2)
for(const {buildSettings:s}of configs) {
  assert.equal(s.PRODUCT_BUNDLE_IDENTIFIER,release.bundleId)
  assert.equal(s.MARKETING_VERSION,release.version)
  assert.equal(String(s.CURRENT_PROJECT_VERSION),release.build)
  assert.equal(String(s.TARGETED_DEVICE_FAMILY),'1')
}
assert.ok(objects.PBXBuildFile.A71000000000000000000001)
assert.ok(objects.PBXFileReference.A71000000000000000000002)
assert.ok(Object.values(objects.PBXResourcesBuildPhase).some(phase=>phase?.files?.some(file=>file.value==='A71000000000000000000001')))
const config=JSON.parse(await readFile(path.join(app,'capacitor.config.json'),'utf8'))
assert.deepEqual(config.packageClassList.sort(),['AppPlugin','CAPBrowserPlugin'])
assert.equal(config.appId,release.bundleId);assert.equal(config.server.url,undefined)
const swift=await readFile(path.join(root,'ios/App/CapApp-SPM/Package.swift'),'utf8')
assert.ok(swift.includes(`exact: "${preparation.templateVersion}"`))
for(const plugin of ['app','browser'])await access(path.resolve(root,'ios/App/CapApp-SPM','../../../node_modules/@capacitor',plugin,'Package.swift'))
const icon=await readFile(path.join(out,'graphics/app-icon-1024.png')),nativeIcon=await readFile(path.join(app,'Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'))
assert.ok(icon.equals(nativeIcon));const dimensions=await sharp(icon).metadata()
assert.equal(dimensions.width,1024);assert.equal(dimensions.height,1024);assert.equal(dimensions.channels,3)
const expected=await sharp(await readFile(path.join(root,release.logo))).resize(1024,1024).flatten({background:'#ffffff'}).removeAlpha().raw().toBuffer()
assert.ok((await sharp(icon).raw().toBuffer()).equals(expected))
const built=await readFile(path.join(root,'.local/dist-public-ios/index.html'),'utf8'),native=await readFile(path.join(app,'public/index.html'),'utf8')
assert.equal(native,built)
const assets=(await readdir(path.join(root,'.local/dist-public-ios/assets'))).filter(file=>file.endsWith('.js'))
for(const file of assets)assert.ok((await readFile(path.join(app,'public/assets',file))).equals(await readFile(path.join(root,'.local/dist-public-ios/assets',file))))
const reportPath=path.join(root,'.local/playwright/ios-web-report.json')
const browser=JSON.parse(await readFile(reportPath,'utf8'))
assert.equal(browser.stats.unexpected,0);assert.ok(browser.stats.expected>=2)
assert.ok(Date.parse(browser.stats.startTime)>=Date.parse(preparation.preparedAt),'Run the iOS web tests after preparing this exact bundle')
const relative=path.relative(path.join(root,'releases'),path.resolve(handoff))
if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||path.basename(handoff)!=='mac-project')throw new Error('Refusing to replace a handoff outside the release directory')
// Only recreate this generated release folder after resolving and checking its workspace boundary.
await rm(handoff,{recursive:true,force:true})
await mkdir(handoff,{recursive:true})
await cp(path.join(root,'ios'),path.join(handoff,'ios'),{recursive:true,filter:file=>!file.includes('xcuserdata')&&!file.includes('DerivedData')})
for(const plugin of ['app','browser']) {
  const dest=path.join(handoff,'node_modules/@capacitor',plugin);await mkdir(dest,{recursive:true})
  for(const item of ['Package.swift','ios','package.json','LICENSE'])await cp(path.join(root,'node_modules/@capacitor',plugin,item),path.join(dest,item),{recursive:true})
}
await mkdir(path.join(handoff,'scripts'),{recursive:true})
for(const file of ['ios-archive.mjs','ios-simulator.mjs'])await cp(path.join(root,'scripts',file),path.join(handoff,'scripts',file))
await cp(path.join(root,'store/app-store'),path.join(handoff,'store/app-store'),{recursive:true})
await cp(path.join(out,'graphics'),path.join(handoff,'graphics'),{recursive:true})
await cp(path.join(root,'docs/IOS_APP_STORE_RELEASE.md'),path.join(handoff,'START-HERE.md'))
const policy=(await readFile(path.join(root,'store/google-play/PRIVACY-POLICY-EN.txt'),'utf8')).replace('clearing the app\'s storage in Android settings or uninstalling the app.','clearing the app\'s storage in Android settings or uninstalling the app. On iPhone, choose Delete App to remove the app and its local data; Offload App may preserve data.')
await writeFile(path.join(handoff,'PRIVACY-POLICY-EN.txt'),policy)
const uz=JSON.parse(await readFile(path.join(root,'store/google-play/listing.uz.json'),'utf8'))
await writeFile(path.join(handoff,'store/app-store/UZBEK-REFERENCE.txt'),`Uzbek text reference; not a claim that App Store Connect offers an uz locale.\n\n${uz.title}\n\n${uz.shortDescription}\n\n${uz.fullDescription}\n`)
const listing=JSON.parse(await readFile(path.join(root,`store/app-store/listing.${release.primaryLocale}.json`),'utf8'))
for(const [key,limit]of [['name',30],['subtitle',30],['promotionalText',170],['keywords',100],['description',4000],['reviewNotes',4000]]) {
  assert.ok([...listing[key]].length<=limit,`App Store ${key} too long`)
  await writeFile(path.join(handoff,'store/app-store',`${key}.txt`),listing[key]+'\n')
}
await writeFile(path.join(handoff,'package.json'),JSON.stringify({name:'yashiluyim-ios-handoff',private:true,type:'module',scripts:{'ios:archive':'node scripts/ios-archive.mjs','ios:simulator':'node scripts/ios-simulator.mjs build','ios:capture':'node scripts/ios-simulator.mjs capture'}},null,2)+'\n')
const verification={...preparation,projectSyntaxParsed:true,appPrivacyInResources:true,guestJavaScriptCopiedExactly:true,plugins:['@capacitor/app','@capacitor/browser'],opaque1024IconMatchesSuppliedLogo:true,webKitBrowserTests:{passed:browser.stats.expected,failed:browser.stats.unexpected,environment:'Playwright WebKit on Windows; not an iOS Simulator or device'},unresolved:['Mac Xcode compile and native runtime validation','Apple Developer team and signing','Actual iOS screenshots','Public support/privacy URL and publisher contact fields','App Store privacy and age-rating answers','App Store Connect upload and review']}
await writeFile(path.join(out,'SOURCE-VERIFICATION.json'),JSON.stringify(verification,null,2)+'\n')
await writeFile(path.join(handoff,'READINESS.json'),JSON.stringify(verification,null,2)+'\n')
const manifest=[]
async function walk(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name)
    if(entry.isDirectory())await walk(file)
    else {
      if(/\.(?:p12|p8|jks|keystore|mobileprovision)$|password|^\.env/i.test(entry.name))throw new Error('Private signing/config file in handoff')
      if(['MANIFEST.json','SHA256SUMS.txt'].includes(entry.name))continue
      const data=await readFile(file);manifest.push({file:path.relative(handoff,file).replaceAll('\\','/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')})
    }
  }
}
await walk(handoff)
await writeFile(path.join(handoff,'MANIFEST.json'),JSON.stringify({type:'Xcode source handoff; not a signed IPA',bundleId:release.bundleId,version:release.version,build:release.build,files:manifest},null,2)+'\n')
await writeFile(path.join(handoff,'SHA256SUMS.txt'),manifest.map(file=>`${file.sha256}  ${file.file}`).join('\n')+'\n')
const zip=path.join(out,`yashil-uyim-ios-${release.version}-mac-handoff.zip`)
if(process.platform==='win32') {
  const result=spawnSync(process.env.YASHILUYIM_POWERSHELL||'pwsh.exe',['-NoProfile','-Command','Compress-Archive -LiteralPath $env:YASHILUYIM_HANDOFF_PATH -DestinationPath $env:YASHILUYIM_HANDOFF_ZIP -CompressionLevel Optimal -Force'],{env:{...process.env,YASHILUYIM_HANDOFF_PATH:handoff,YASHILUYIM_HANDOFF_ZIP:zip},stdio:'inherit'})
  if(result.error||result.status!==0)throw new Error('Handoff ZIP failed')
} else {
  const result=spawnSync('ditto',['-c','-k','--sequesterRsrc','--keepParent',handoff,zip],{stdio:'inherit'})
  if(result.error||result.status!==0)throw new Error('Handoff ZIP failed')
}
console.log(`Verified ${manifest.length} source/metadata files and packaged ${zip}. Xcode compilation, signing, actual iOS screenshots and upload are still required.`)
