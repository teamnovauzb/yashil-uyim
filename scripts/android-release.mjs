import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { randomBytes, createHash } from 'node:crypto'
import path from 'node:path'

if(process.platform!=='win32')throw new Error('This local release helper uses Windows DPAPI and the configured Android Studio JDK')
const root=path.resolve(import.meta.dirname,'..'),android=path.join(root,'android'),out=path.join(root,'releases/google-play-1.0.0')
const java=process.env.JAVA_HOME||'C:/Program Files/Android/Android Studio/jbr'
const sdk=process.env.ANDROID_HOME||path.join(process.env.LOCALAPPDATA,'Android/Sdk')
const powershell=process.env.YASHILUYIM_POWERSHELL||'pwsh.exe'
const signing=path.join(root,'.local/signing'),keystore=path.join(signing,'yashiluyim-upload.jks'),passwordFile=path.join(signing,'upload-password.dpapi.txt')
await access(path.join(android,'app/build.gradle'));await mkdir(signing,{recursive:true});await mkdir(out,{recursive:true})
function run(command,args,options={}) {
  const result=spawnSync(command,args,{cwd:root,encoding:'utf8',...options})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(options.stdio==='inherit'?`Command failed (${path.basename(command)})`:result.stderr||`Command failed (${path.basename(command)})`)
  return result.stdout
}
const protect="$taskSecret=[Console]::In.ReadToEnd(); ConvertTo-SecureString -String $taskSecret -AsPlainText -Force | ConvertFrom-SecureString"
const unprotect="$taskSecret=[Console]::In.ReadToEnd()|ConvertTo-SecureString;$taskPtr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret);try{[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPtr))}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPtr)}"
let password
try {await access(keystore);password=run(powershell,['-NoProfile','-NonInteractive','-Command',unprotect],{input:(await readFile(passwordFile,'utf8')).trim()}).trim()}
catch {
  try{await access(keystore);throw new Error('Existing upload key must be preserved; restore its password file instead of generating a replacement')}catch(check){if(check.code!=='ENOENT')throw check}
  password=randomBytes(32).toString('base64url')
  await writeFile(passwordFile,run(powershell,['-NoProfile','-NonInteractive','-Command',protect],{input:password}).trim()+'\n',{flag:'wx'})
  run(path.join(java,'bin/keytool.exe'),['-genkeypair','-keystore',keystore,'-storetype','JKS','-alias','yashiluyim-upload','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Yashil Uyim Upload, O=Yashil Uyim, C=UZ','-storepass:env','YASHILUYIM_UPLOAD_PASSWORD','-keypass:env','YASHILUYIM_UPLOAD_PASSWORD'],{env:{...process.env,YASHILUYIM_UPLOAD_PASSWORD:password}})
  console.log('Created an ignored upload key; password protected with Windows DPAPI. Keep both private signing files backed up.')
}
if(!password)throw new Error('Upload password could not be recovered')
let gradle=await readFile(path.join(android,'app/build.gradle'),'utf8')
gradle=gradle.replace(/versionCode \d+/,'versionCode 1').replace(/versionName "[^"]+"/,'versionName "1.0.0"')
if(!gradle.includes('YASHILUYIM_UPLOAD_PASSWORD'))gradle=gradle.replace('    buildTypes {',`    signingConfigs {
        release {
            storeFile file(System.getenv('YASHILUYIM_UPLOAD_KEYSTORE'))
            storePassword System.getenv('YASHILUYIM_UPLOAD_PASSWORD')
            keyAlias 'yashiluyim-upload'
            keyPassword System.getenv('YASHILUYIM_UPLOAD_PASSWORD')
        }
    }
    buildTypes {`).replace('        release {\n            minifyEnabled','        release {\n            signingConfig signingConfigs.release\n            minifyEnabled')
await writeFile(path.join(android,'app/build.gradle'),gradle)
const wrapper=path.join(android,'gradle/wrapper/gradle-wrapper.properties')
await writeFile(wrapper,(await readFile(wrapper,'utf8')).replace('-all.zip','-bin.zip'))
await writeFile(path.join(android,'local.properties'),`sdk.dir=${sdk.replaceAll('\\','/').replace(':','\\:')}\n`)
const manifestPath=path.join(android,'app/src/main/AndroidManifest.xml')
let manifest=await readFile(manifestPath,'utf8')
manifest=manifest.replace('android:allowBackup="true"','android:allowBackup="false" android:usesCleartextTraffic="false"')
await writeFile(manifestPath,manifest)
const res=path.join(android,'app/src/main/res')
await writeFile(path.join(res,'values/colors.xml'),'<resources><color name="colorPrimary">#245C40</color><color name="colorPrimaryDark">#245C40</color><color name="colorAccent">#245C40</color><color name="appBackground">#F8F4EC</color></resources>\n')
await writeFile(path.join(res,'values/styles.xml'),`<resources>
<style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar"><item name="colorPrimary">@color/colorPrimary</item><item name="colorPrimaryDark">@color/colorPrimaryDark</item><item name="colorAccent">@color/colorAccent</item></style>
<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar"><item name="windowActionBar">false</item><item name="windowNoTitle">true</item><item name="android:windowBackground">@color/appBackground</item><item name="android:statusBarColor">@color/appBackground</item><item name="android:navigationBarColor">@color/appBackground</item><item name="android:windowLightStatusBar">true</item><item name="android:windowLightNavigationBar">true</item></style>
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen"><item name="windowSplashScreenBackground">@color/colorPrimary</item><item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item><item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item></style>
</resources>\n`)
const env={...process.env,JAVA_HOME:java,ANDROID_HOME:sdk,ANDROID_SDK_ROOT:sdk,YASHILUYIM_UPLOAD_KEYSTORE:keystore,YASHILUYIM_UPLOAD_PASSWORD:password}
console.log('Building only the isolated guest Android release: API 36, version 1.0.0 (1). No deployment or original Mini App build.')
run(process.env.ComSpec||'C:/Windows/System32/cmd.exe',['/d','/c','gradlew.bat','--no-daemon','--console=plain','--max-workers=2','bundleRelease','assembleRelease'],{cwd:android,env,stdio:'inherit'})
for(const [source,name]of [['app/build/outputs/bundle/release/app-release.aab','yashil-uyim-1.0.0-1.aab'],['app/build/outputs/apk/release/app-release.apk','yashil-uyim-1.0.0-1.apk']]) {
  await copyFile(path.join(android,source),path.join(out,name))
  const data=await readFile(path.join(out,name));console.log(`${name}: ${data.length} bytes, SHA-256 ${createHash('sha256').update(data).digest('hex')}`)
}
run(path.join(java,'bin/keytool.exe'),['-exportcert','-rfc','-keystore',keystore,'-alias','yashiluyim-upload','-storepass:env','YASHILUYIM_UPLOAD_PASSWORD','-file',path.join(out,'upload-certificate.pem')],{env})
console.log('Signed release artifacts and public upload certificate saved. Private signing key/password are excluded from the release package.')
