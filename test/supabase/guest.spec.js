import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { publicColumns, publicSettingKeys } from '../../shared/public-content.js'
const source=JSON.parse(await readFile(new URL('../../src/public/content.json',import.meta.url),'utf8'))

test('direct Supabase release path reads only public fields, supports refresh, and exposes its privacy policy',async({page})=>{
  const requests=[],data=structuredClone(source)
  await page.context().route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url())
    if(url.hostname==='public-test.supabase.co') {
      requests.push({method:request.method(),url,headers:request.headers()})
      const table=url.pathname.split('/').at(-1)
      if(!['programs','news','gallery','settings'].includes(table))throw new Error('Private source requested')
      const rows=table==='settings'?Object.entries(data.settings).map(([key,value])=>({key,value})):data[table]
      return route.fulfill({json:rows,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}})
    }
    if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort()
    return route.continue()
  })
  await page.goto('/yangiliklar')
  await expect.poll(()=>requests.length).toBeGreaterThanOrEqual(4)
  for(const request of requests) {
    expect(request.method).toBe('GET');expect(request.headers.cookie).toBeUndefined()
    const table=request.url.pathname.split('/').at(-1)
    expect(request.url.searchParams.get('select')).toBe(table==='settings'?'key,value':publicColumns[table].join(','))
    if(table==='settings')expect(request.url.searchParams.get('key')).toBe(`in.(${publicSettingKeys.join(',')})`)
  }
  data.news=[{id:800,title:'Yangi festival e’loni',content:'Ochiq manbadan yangilangan e’lon.',published_at:'2026-10-26T10:00:00Z'}]
  await page.getByRole('button',{name:'Ma’lumotlarni yangilash'}).click()
  await expect(page.getByRole('heading',{name:'Yangi festival e’loni',exact:true})).toBeVisible()
  await page.goto('/maxfiylik')
  await expect(page.getByRole('heading',{name:'Maxfiylik siyosati',exact:true})).toBeVisible()
  await expect(page.getByText(/Supabase va ochiq media/)).toBeVisible()
  await expect(page.getByRole('link',{name:/Instagram: @yashil_uyim/})).toBeVisible()
  await expect(page.getByRole('button',{name:/kirish|register/i})).toHaveCount(0)
})
