import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const source=JSON.parse(await readFile(new URL('../../src/public/content.json',import.meta.url),'utf8'))
test.beforeEach(async({context})=>{
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url())
    if(url.pathname.startsWith('/rest/v1/')) {
      expect(route.request().method()).toBe('GET')
      const table=url.pathname.split('/').at(-1)
      expect(['programs','news','gallery','settings']).toContain(table)
      const rows=table==='settings'?Object.entries(source.settings).map(([key,value])=>({key,value})):source[table]
      return route.fulfill({json:rows,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}})
    }
    if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort()
    return route.continue()
  })
})
test('production guest bundle navigates on an iPhone-sized WebKit viewport and exposes privacy without sign-in',async({page})=>{
  await page.goto('/')
  for(const [label,heading]of [['Dastur','Festival dasturi'],['Yangiliklar','Yangiliklar'],['Galereya','Festival galereyasi'],['Manzil','Manzil va vaqt']]) {
    await page.getByRole('navigation').getByRole('link',{name:label,exact:true}).click()
    await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  }
  await page.goto('/maxfiylik')
  await expect(page.getByRole('heading',{name:'Maxfiylik siyosati',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:/kirish|register/i})).toHaveCount(0)
})
test('saved program persists across reload and remains readable offline on a small WebKit viewport',async({page,context})=>{
  await page.setViewportSize({width:375,height:667})
  await page.goto('/dastur')
  const save=page.getByRole('button',{name:/saqlash$/}).first()
  await expect(save).toBeVisible();await save.click()
  await page.getByRole('button',{name:'Saqlangan (1)',exact:true}).click()
  await expect(page.locator('.pub-program')).toHaveCount(1)
  await page.reload()
  await page.getByRole('button',{name:'Saqlangan (1)',exact:true}).click()
  await context.setOffline(true)
  await expect(page.locator('.pub-program')).toHaveCount(1)
  await page.getByRole('navigation').getByRole('link',{name:'Yangiliklar',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Yangiliklar',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})
