import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const source=JSON.parse(await readFile(new URL('../../src/public/content.json',import.meta.url),'utf8'))
async function guestApi(page,{fail=false}={}) {
  const requests=[],data=structuredClone(source)
  await page.context().route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());requests.push({url:url.href,method:request.method(),headers:request.headers()})
    if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort()
    if(url.pathname==='/api/public/content')return fail?route.fulfill({status:503,json:{message:'Offline test'}}):route.fulfill({json:data})
    if(url.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{message:'Private endpoint must not be requested'}})
    return route.continue()
  })
  return {requests,data}
}
test('guest reads real-shaped content immediately, without login, credentials, or write requests',async({page})=>{
  const {requests}=await guestApi(page)
  await page.context().addCookies([{name:'old_session',value:'must-not-go-to-content-api',url:'http://127.0.0.1:4175'}])
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Yashil Uyim',exact:true})).toBeVisible()
  const titleBox=await page.getByRole('heading',{name:'Yashil Uyim',exact:true}).boundingBox(),headerBox=await page.locator('.pub-header').boundingBox()
  expect(titleBox.y).toBeGreaterThanOrEqual(headerBox.y+headerBox.height)
  await expect(page.getByRole('button',{name:'Telegram orqali kirish'})).toHaveCount(0)
  await expect(page.getByRole('navigation',{name:'Asosiy navigatsiya'}).getByRole('link')).toHaveCount(5)
  const endpoints=requests.filter(r=>new URL(r.url).pathname.startsWith('/api/'))
  expect(endpoints.length).toBeGreaterThan(0)
  expect(endpoints.every(r=>new URL(r.url).pathname==='/api/public/content'&&r.method==='GET'&&!r.headers.authorization&&!r.headers.cookie)).toBe(true)
  expect(requests.some(r=>r.url.includes('telegram.org')||r.url.includes('/auth/')||r.url.includes('supabase.co/rest/'))).toBe(false)
  expect(requests.some(r=>r.url.includes('/src/lib/session')||r.url.includes('/src/pages/Admin')||r.url.includes('/src/pages/Tickets'))).toBe(false)
  await expect(page.locator('script[src*="telegram"]')).toHaveCount(0)
  await page.screenshot({path:'.local/playwright/public-home.png',fullPage:true})
})
test('program search and device-only saved sessions survive reload and offline fallback',async({page})=>{
  await guestApi(page,{fail:true})
  await page.goto('/dastur')
  const title=source.programs[1].title
  await page.getByRole('searchbox',{name:'Dasturdan qidirish'}).fill(title)
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('button',{name:`${title}: saqlash`,exact:true}).click()
  await page.getByRole('searchbox',{name:'Dasturdan qidirish'}).fill('')
  await page.getByRole('button',{name:'Saqlangan (1)',exact:true}).click()
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible()
  await page.reload()
  await page.getByRole('button',{name:'Saqlangan (1)',exact:true}).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible()
  const stored=await page.evaluate(()=>Object.keys(localStorage))
  expect(stored.every(key=>key.startsWith('yashiluyim.public.'))).toBe(true)
})
test('refresh picks up backend changes without a login or new app release',async({page})=>{
  const {data}=await guestApi(page)
  await page.goto('/yangiliklar')
  await expect(page.getByRole('heading',{name:source.news[0].title,exact:true})).toBeVisible()
  data.news=[{id:9001,title:'VPSdan yangi e’lon',content:'Yangilangan haqiqiy server javobi shaklidagi sinov.',published_at:'2026-10-26T09:00:00Z',image_url:null}]
  data.updated_at='2026-10-26T09:00:00Z'
  await page.getByRole('button',{name:'Ma’lumotlarni yangilash'}).click()
  await expect(page.getByRole('heading',{name:'VPSdan yangi e’lon',exact:true})).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading',{name:'VPSdan yangi e’lon',exact:true})).toBeVisible()
})
test('private URLs redirect to public home; gallery and venue stay accessible with no permissions',async({page})=>{
  await guestApi(page)
  for(const route of ['/admin','/chipta','/profile','/contact','/taklif']) {
    await page.goto(route);await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading',{name:'Yashil Uyim',exact:true})).toBeVisible()
  }
  await page.getByRole('navigation',{name:'Asosiy navigatsiya'}).getByRole('link',{name:'Galereya',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Festival galereyasi'})).toBeVisible()
  await page.getByRole('navigation',{name:'Asosiy navigatsiya'}).getByRole('link',{name:'Manzil',exact:true}).click()
  await expect(page.getByRole('heading',{name:source.settings.festival_address,exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Ilova va maxfiylik haqida'}).click()
  await expect(page.getByRole('heading',{name:'Hisobsiz foydalanish'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
test('small screens and dark mode keep the schedule readable and keyboard navigation available',async({page})=>{
  await guestApi(page)
  await page.setViewportSize({width:320,height:740});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'})
  await page.goto('/dastur')
  await expect(page.getByText(/31-oktabr, 2026/).first()).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.getByRole('searchbox',{name:'Dasturdan qidirish'}).focus()
  await expect(page.getByRole('searchbox',{name:'Dasturdan qidirish'})).toBeFocused()
  await page.screenshot({path:'.local/playwright/public-program-dark.png',fullPage:true})
})
