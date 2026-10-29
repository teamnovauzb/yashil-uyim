import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
if(process.platform!=='darwin')throw new Error('A signed iOS archive requires macOS with Xcode 26 or later. Windows preparation does not produce an IPA.')
const root=path.resolve(import.meta.dirname,'..'),team=process.env.IOS_TEAM_ID||''
if(!/^[A-Z0-9]{10}$/.test(team))throw new Error('Set IOS_TEAM_ID to your Apple Developer Team ID. No archive was started.')
const release=JSON.parse(await readFile(path.join(root,'store/app-store/release.json'),'utf8'))
function run(command,args,capture=false) {
  const result=spawnSync(command,args,{cwd:root,encoding:'utf8',...(capture?{}:{stdio:'inherit'})})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`${command} failed; no upload was attempted`)
  return result.stdout?.trim()
}
const xcode=run('xcodebuild',['-version'],true),sdk=run('xcrun',['--sdk','iphoneos','--show-sdk-version'],true)
if(!(Number(xcode.match(/Xcode (\d+)/)?.[1])>=26)||!/^\d/.test(sdk)||Number(sdk.split('.')[0])<26)throw new Error('Select Xcode 26+ with an iOS 26+ SDK before archiving')
const output=path.join(root,'build-output',`ios-${release.version}-${release.build}`),archive=path.join(output,'YashilUyim.xcarchive')
await mkdir(output,{recursive:true})
run('plutil',['-lint','ios/App/App/Info.plist','ios/App/App/PrivacyInfo.xcprivacy'])
const project='ios/App/App.xcodeproj'
run('xcodebuild',['-resolvePackageDependencies','-project',project,'-scheme','App'])
run('xcodebuild',['-project',project,'-scheme','App','-configuration','Release','-destination','generic/platform=iOS','-archivePath',archive,`DEVELOPMENT_TEAM=${team}`,'CODE_SIGN_STYLE=Automatic',`MARKETING_VERSION=${release.version}`,`CURRENT_PROJECT_VERSION=${release.build}`,'-allowProvisioningUpdates','archive'])
const app=path.join(archive,'Products/Applications/App.app'),plist=path.join(app,'Info.plist')
for(const [key,value]of [['CFBundleIdentifier',release.bundleId],['CFBundleDisplayName',release.displayName],['CFBundleShortVersionString',release.version],['CFBundleVersion',release.build]])if(run('/usr/libexec/PlistBuddy',['-c',`Print :${key}`,plist],true)!==value)throw new Error(`Archive identity mismatch: ${key}`)
run('codesign',['--verify','--deep','--strict',app])
run('plutil',['-lint',path.join(app,'PrivacyInfo.xcprivacy')])
const options=path.join(output,'ExportOptions.plist')
await writeFile(options,`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>destination</key><string>export</string><key>teamID</key><string>${team}</string><key>signingStyle</key><string>automatic</string><key>manageAppVersionAndBuildNumber</key><false/><key>stripSwiftSymbols</key><true/></dict></plist>`)
run('xcodebuild',['-exportArchive','-archivePath',archive,'-exportOptionsPlist',options,'-exportPath',path.join(output,'export'),'-allowProvisioningUpdates'])
const files=(await readdir(path.join(output,'export'))).filter(file=>file.endsWith('.ipa'))
if(files.length!==1)throw new Error('Expected exactly one exported IPA')
const ipa=path.join(output,'export',files[0]),data=await readFile(ipa)
await writeFile(path.join(output,'BUILD-VERIFICATION.json'),JSON.stringify({bundleId:release.bundleId,version:release.version,build:release.build,xcode,sdk,archiveSignatureVerified:true,ipa:path.relative(root,ipa),ipaSha256:createHash('sha256').update(data).digest('hex'),uploaded:false,physicalDeviceTested:false},null,2)+'\n')
console.log(`Signed IPA exported to ${ipa}. No App Store upload or review submission was performed.`)
