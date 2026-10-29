import { readFile, writeFile, mkdir, cp, access } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { loadEnv } from 'vite'
import { publicSourceConfig } from '../server/src/public-source.js'
import { readSupabasePublicContent } from '../shared/supabase-public.js'

const root=path.resolve(import.meta.dirname,'..'),release=JSON.parse(await readFile(path.join(root,'store/app-store/release.json'),'utf8'))
const require=createRequire(new URL('../server/package.json',import.meta.url)),sharp=require('sharp')
if(release.bundleId!=='uz.teamnova.yashiluyim'||!/^\d+\.\d+\.\d+$/.test(release.version)||!/^\d+$/.test(release.build)||release.devices!=='iPhone')throw new Error('Invalid iOS release identity')
const loaded=loadEnv('public',root,'')
const source=publicSourceConfig({PUBLIC_CONTENT_SOURCE:'supabase',GUEST_SUPABASE_URL:loaded.VITE_PUBLIC_SUPABASE_URL?.replace(/\/$/,''),GUEST_SUPABASE_PUBLIC_KEY:loaded.VITE_PUBLIC_SUPABASE_KEY})
const content=await readSupabasePublicContent(source).catch(()=>{throw new Error('Current public Supabase preflight failed; no iOS project was changed')})
const ios=path.join(root,'ios'),out=path.join(root,`releases/app-store-${release.version}`),web='.local/dist-public-ios'
const env={...process.env,VITE_PUBLIC_CONTENT_SOURCE:'supabase',VITE_PUBLIC_API_URL:'',VITE_PUBLIC_SUPABASE_URL:loaded.VITE_PUBLIC_SUPABASE_URL,VITE_PUBLIC_SUPABASE_KEY:loaded.VITE_PUBLIC_SUPABASE_KEY,YASHILUYIM_MOBILE_MODE:'public',YASHILUYIM_MOBILE_WEB_DIR:web,YASHILUYIM_PUBLIC_BUNDLE_DIR:web}
function run(command,args) {
  const result=spawnSync(command,args,{cwd:root,env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error('iOS preparation failed; no upload/deployment was attempted')
}
if(existsSync(ios))await access(path.join(ios,'.yashiluyim-prepared.json')).catch(()=>{throw new Error('Existing iOS project is not owned by this preparation helper; preserve it and inspect manually')})
else {
  await mkdir(ios)
  run('tar',['-xzf','node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz','-C',ios])
  await writeFile(path.join(ios,'.yashiluyim-prepared.json'),JSON.stringify({generator:'ios-prepare.mjs',template:'@capacitor/cli ios-spm-template'}))
}
run(process.execPath,['node_modules/vite/bin/vite.js','build','--mode','public','--outDir',web])
run(process.execPath,['scripts/check-public-bundle.mjs'])
run(process.execPath,['node_modules/@capacitor/cli/bin/capacitor','copy','ios'])
const app=path.join(ios,'App/App'),project=path.join(ios,'App/App.xcodeproj/project.pbxproj')
let pbx=await readFile(project,'utf8')
pbx=pbx.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g,`PRODUCT_BUNDLE_IDENTIFIER = ${release.bundleId};`).replace(/MARKETING_VERSION = [^;]+;/g,`MARKETING_VERSION = ${release.version};`).replace(/CURRENT_PROJECT_VERSION = [^;]+;/g,`CURRENT_PROJECT_VERSION = ${release.build};`).replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g,'TARGETED_DEVICE_FAMILY = 1;').replace(/IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g,`IPHONEOS_DEPLOYMENT_TARGET = ${release.minimumIOS};`)
if(!pbx.includes('PrivacyInfo.xcprivacy in Resources')) {
  pbx=pbx.replace('/* End PBXBuildFile section */','\t\tA71000000000000000000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = A71000000000000000000002 /* PrivacyInfo.xcprivacy */; };\n/* End PBXBuildFile section */')
    .replace('/* End PBXFileReference section */','\t\tA71000000000000000000002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n/* End PBXFileReference section */')
    .replace('504EC3131FED79650016851F /* Info.plist */,','504EC3131FED79650016851F /* Info.plist */,\n\t\t\t\tA71000000000000000000002 /* PrivacyInfo.xcprivacy */,')
    .replace('504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,','504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,\n\t\t\t\tA71000000000000000000001 /* PrivacyInfo.xcprivacy in Resources */,')
}
await writeFile(project,pbx)
let plist=await readFile(path.join(app,'Info.plist'),'utf8')
plist=plist.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]+/,`$1${release.displayName}`)
  .replace(/<key>UIRequiredDeviceCapabilities<\/key>\s*<array>[\s\S]*?<\/array>/,'<key>UIRequiredDeviceCapabilities</key><array><string>arm64</string></array>')
if(!plist.includes('ITSAppUsesNonExemptEncryption'))plist=plist.replace(/<\/dict>\s*<\/plist>/,'<key>ITSAppUsesNonExemptEncryption</key><false/>\n<key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><false/></dict>\n</dict></plist>')
await writeFile(path.join(app,'Info.plist'),plist)
await cp(path.join(root,'native/ios/PrivacyInfo.xcprivacy'),path.join(app,'PrivacyInfo.xcprivacy'))
await cp(path.join(root,'native/ios/LaunchScreen.storyboard'),path.join(app,'Base.lproj/LaunchScreen.storyboard'))
const cap=JSON.parse(await readFile('node_modules/@capacitor/ios/package.json','utf8'))
await writeFile(path.join(ios,'App/CapApp-SPM/Package.swift'),`// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [.library(name: "CapApp-SPM", targets: ["CapApp-SPM"])],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "${cap.version}"),
        .package(name: "CapacitorApp", path: "../../../node_modules/@capacitor/app"),
        .package(name: "CapacitorBrowser", path: "../../../node_modules/@capacitor/browser")
    ],
    targets: [.target(name: "CapApp-SPM", dependencies: [
        .product(name: "Capacitor", package: "capacitor-swift-pm"),
        .product(name: "Cordova", package: "capacitor-swift-pm"),
        .product(name: "CapacitorApp", package: "CapacitorApp"),
        .product(name: "CapacitorBrowser", package: "CapacitorBrowser")
    ])]
)
`)
const schemeDir=path.join(ios,'App/App.xcodeproj/xcshareddata/xcschemes');await mkdir(schemeDir,{recursive:true})
await writeFile(path.join(schemeDir,'App.xcscheme'),`<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="504EC3031FED79650016851F" BuildableName="App.app" BlueprintName="App" ReferencedContainer="container:App.xcodeproj"/></BuildActionEntry></BuildActionEntries></BuildAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="504EC3031FED79650016851F" BuildableName="App.app" BlueprintName="App" ReferencedContainer="container:App.xcodeproj"/></BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="504EC3031FED79650016851F" BuildableName="App.app" BlueprintName="App" ReferencedContainer="container:App.xcodeproj"/></BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
`)
const logo=await readFile(path.join(root,release.logo));await mkdir(path.join(out,'graphics'),{recursive:true})
const icon=await sharp(logo).resize(1024,1024).flatten({background:'#ffffff'}).removeAlpha().png().toBuffer()
await writeFile(path.join(app,'Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'),icon)
await writeFile(path.join(out,'graphics/app-icon-1024.png'),icon)
const brand=path.join(app,'Assets.xcassets/BrandLogo.imageset');await mkdir(brand,{recursive:true})
await writeFile(path.join(brand,'logo.png'),await sharp(logo).resize(576,576).flatten({background:'#ffffff'}).removeAlpha().png().toBuffer())
await writeFile(path.join(brand,'Contents.json'),JSON.stringify({images:[{filename:'logo.png',idiom:'universal',scale:'3x'}],info:{author:'xcode',version:1}},null,2))
const status={bundleId:release.bundleId,version:release.version,build:release.build,source:'supabase',devices:'iPhone',iosMinimum:release.minimumIOS,templateVersion:cap.version,projectPrepared:true,xcodeCompiled:false,signedIPA:false,simulatorTested:false,physicalDeviceTested:false,uploaded:false,submissionReady:false,logo:release.logo,iconSha256:createHash('sha256').update(icon).digest('hex'),livePublicCounts:{programs:content.programs.length,news:content.news.length,gallery:content.gallery.length},preparedAt:new Date().toISOString()}
await writeFile(path.join(out,'PREPARATION.json'),JSON.stringify(status,null,2)+'\n')
console.log('iOS source project prepared with public Supabase data and original logo. Xcode compilation, signing, real iOS screenshots and upload require macOS; no IPA was produced.')
