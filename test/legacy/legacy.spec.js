import { test, expect } from '@playwright/test'

test.beforeEach(async({context,page})=>{
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort())
  await page.addInitScript(()=>sessionStorage.setItem('splash_shown','true'))
})
test('default browser mode keeps the existing guest profile without VPS authentication',async({page})=>{
  const vpsRequests=[]
  page.on('request',request=>{if(request.url().includes('/api/auth/'))vpsRequests.push(request.url())})
  await page.goto('/profile')
  await expect(page.getByRole('heading',{name:'Mehmon',exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Festivalga xush kelibsiz'})).toHaveCount(0)
  expect(vpsRequests).toEqual([])
})
test('default Telegram mode still uses its Telegram identity and existing contact cache',async({page})=>{
  await page.addInitScript(()=>{
    window.Telegram={WebApp:{platform:'android',initDataUnsafe:{user:{id:123456789,first_name:'Mini App mehmoni'}},ready(){},expand(){},disableVerticalSwipes(){},BackButton:{show(){},hide(){},onClick(){},offClick(){}}}}
    localStorage.setItem('tg_contact_123456789',JSON.stringify({phone:'+998901234567'}))
  })
  await page.goto('/profile')
  await expect(page.getByRole('heading',{name:'Mini App mehmoni',exact:true})).toBeVisible()
  await expect(page.getByText('+998901234567',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Telegram orqali kirish'})).toHaveCount(0)
})
