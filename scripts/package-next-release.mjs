import { readFile, writeFile, mkdir, copyFile, readdir, cp } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const root=path.resolve(import.meta.dirname,'..')
const release=JSON.parse(await readFile(path.join(root,'store/google-play/next-release.json'),'utf8'))
const out=path.join(root,`releases/google-play-${release.versionName}`)
const profile=JSON.parse(await readFile(path.join(out,'PROFILE.json'),'utf8'))
if(!profile.storeRelease||profile.profile!=='supabase'||profile.versionCode!==release.versionCode)throw new Error('Build the corrected Supabase store release first')
const notes={uz:'Ilova belgisi Google Play sahifasidagi Yashil Uyim logotipiga moslashtirildi. Festival dasturi va yangiliklar ochiq ma’lumotlar orqali yangilanadi. Ro‘yxatdan o‘tish talab qilinmaydi.',en:'Updated the installed app icon to match the Yashil Uyim logo on Google Play. Festival programs and news continue to use current public data. No registration required.'}
for(const locale of ['uz','en']) {
  const data=JSON.parse(await readFile(path.join(root,`store/google-play/listing.${locale}.json`),'utf8'))
  data.releaseNotes=notes[locale]
  const dir=path.join(out,'listing',data.language);await mkdir(dir,{recursive:true})
  for(const [key,file,limit]of [['title','title.txt',30],['shortDescription','short-description.txt',80],['fullDescription','full-description.txt',4000],['releaseNotes','release-notes.txt',500]]) {
    if([...data[key]].length>limit)throw new Error(`${locale} ${key} too long`)
    await writeFile(path.join(dir,file),data[key]+'\n')
  }
}
await cp(path.join(root,'releases/google-play-1.0.0/screenshots'),path.join(out,'screenshots'),{recursive:true})
await copyFile(path.join(root,'store/google-play/PRIVACY-POLICY-EN.txt'),path.join(out,'PRIVACY-POLICY-EN.txt'))
await writeFile(path.join(out,'SUBMISSION.md'),`# Yashil Uyim icon correction\n\nUpload yashil-uyim-${release.versionName}-${release.versionCode}.aab (not the APK). Package: ${release.applicationId}. Version ${release.versionName}, code ${release.versionCode}.\n\nUse graphics/app-icon-512.png in every default, translated and custom store listing. It uses the same globe-house artwork as the installed launcher icon. Keep the store title Yashil Uyim. Check every listing for the old tree icon. The feature graphic is also updated. The included screenshots show the unchanged guest screens.\n\nThis build uses current public Supabase data, not VPS. No login, registration or payments. VPS will require a later higher-version update. Matching R8 mapping is embedded in the AAB and provided as mapping.txt. The original upload certificate is retained.\n\nPaste the relevant listing release-notes.txt into the release. Review the listing and new bundle together before sending changes for review. This package does not upload or submit anything. Approval is determined by Google.\n\nThe privacy template still needs your published support email if reused; keep the already published policy URL accurate.\n`)
const files=[]
async function walk(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name)
    if(entry.isDirectory())await walk(file)
    else if(!['MANIFEST.json','SHA256SUMS.txt'].includes(entry.name)) {
      if(/\.(jks|keystore)$|password|\.env/i.test(entry.name))throw new Error('Private file in release package')
      const data=await readFile(file)
      files.push({file:path.relative(out,file).replaceAll('\\','/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')})
    }
  }
}
await walk(out)
await writeFile(path.join(out,'MANIFEST.json'),JSON.stringify({package:release.applicationId,versionName:release.versionName,versionCode:release.versionCode,source:profile.source,files},null,2)+'\n')
await writeFile(path.join(out,'SHA256SUMS.txt'),files.map(file=>`${file.sha256}  ${file.file}`).join('\n')+'\n')
console.log(`Packaged ${files.length} corrected-release files. No upload or deployment.`)
