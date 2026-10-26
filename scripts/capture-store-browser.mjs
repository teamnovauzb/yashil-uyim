import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { setTimeout } from 'node:timers/promises'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..'),base='http://127.0.0.1:4178',out=path.join(root,'releases/google-play-1.0.0/screenshots/phone')
const require=createRequire(new URL('../server/package.json',import.meta.url)),sharp=require('sharp')
await mkdir(out,{recursive:true})
const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'preview','--mode','public','--outDir','dist-public','--host','127.0.0.1','--port','4178','--strictPort'],{cwd:root,stdio:'ignore'})
let browser
try {
  let ready=false
  for(let i=0;i<40;i++){try{if((await fetch(base)).ok){ready=true;break}}catch{/* Preview is still starting. */}await setTimeout(250)}
  if(!ready)throw new Error('Production preview failed to start')
  browser=await chromium.launch({channel:'chrome',headless:true})
  const context=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'light'})
  const page=await context.newPage(),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await context.route('**/*',route=>{if(!['GET','HEAD','OPTIONS'].includes(route.request().method()))throw new Error('Guest screenshots must not send data writes');return route.continue()})
  await page.goto(base,{waitUntil:'networkidle'})
  await page.getByRole('heading',{name:'Yashil Uyim',exact:true}).waitFor()
  const live=await page.evaluate(()=>!!localStorage.getItem('yashiluyim.public.content.v1'))
  if(!live)throw new Error('A successful live public response is required for release screenshots')
  async function shot(filename) {
    await page.locator('img').evaluateAll(async images=>{await Promise.all(images.filter(img=>img.loading!=='lazy'||img.getBoundingClientRect().top<innerHeight).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,12000)})))})
    const bytes=await page.screenshot({fullPage:false})
    await sharp(bytes).removeAlpha().png().toFile(path.join(out,filename));console.log(`Captured production guest UI: ${filename}`)
  }
  await shot('01-home.png')
  for(const [label,heading,file]of [['Dastur','Festival dasturi','02-program.png'],['Yangiliklar','Yangiliklar','03-news.png'],['Galereya','Festival galereyasi','04-gallery.png'],['Manzil','Manzil va vaqt','05-venue.png']]) {
    await page.getByRole('navigation',{name:'Asosiy navigatsiya'}).getByRole('link',{name:label,exact:true}).click()
    await page.getByRole('heading',{name:heading,exact:true}).waitFor();await shot(file)
  }
  await page.getByRole('link',{name:'Ilova va maxfiylik haqida'}).click()
  await page.getByRole('link',{name:'Maxfiylik siyosati',exact:true}).click()
  await page.getByRole('heading',{name:'Maxfiylik siyosati',exact:true}).waitFor();await shot('06-privacy.png')
  if(errors.length)throw new Error(`Production UI errors: ${errors.join('; ')}`)
  await writeFile(path.join(out,'CAPTURE-INFO.txt'),'Actual production guest UI captured in Chromium, 360x640 CSS pixels at 3x scale = 1080x1920. Live current Supabase public GET data; no mock responses, promotional overlays or invented device frames. PNG normalized to RGB with unchanged visible pixels. These are webview-UI captures, not claimed physical-device captures.\n')
  console.log('Six real production UI screenshots captured; live public data verified; zero page errors')
} finally {await browser?.close();server.kill()}
