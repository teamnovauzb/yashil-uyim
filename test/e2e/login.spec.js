import { test, expect } from '@playwright/test'

async function stubApi(page,{admin=false}={}) {
  const requests=[]
  await page.context().route('**/*',async route=>{
    const url=new URL(route.request().url())
    if(!['127.0.0.1','localhost'].includes(url.hostname)){requests.push(url.hostname);return route.abort()}
    if(!url.pathname.startsWith('/api/'))return route.continue()
    const json=(body,status=200)=>route.fulfill({status,json:body})
    if(url.pathname==='/api/auth/refresh')return json({message:'Sign in again'},401)
    if(url.pathname==='/api/auth/start')return json({challenge:'test_challenge',telegram_url:'https://t.me/YashilUyimTestBot?start=login_test',expires_in:300})
    if(url.pathname==='/api/auth/verify') {
      const body=route.request().postDataJSON()
      return body.code==='123456'?json({access_token:'test_access_token',expires_in:900}):json({message:'Kod noto‘g‘ri. Qayta urinib ko‘ring.'},401)
    }
    if(url.pathname==='/api/auth/me')return json({id:1,first_name:'Festival mehmoni',username:'test_guest',phone:'+998901234567',is_admin:admin,is_super:admin})
    if(url.pathname==='/api/auth/logout')return json({ok:true})
    if(url.pathname.startsWith('/api/data/')) {
      const table=url.pathname.split('/').at(-1)
      if(table==='settings') {
        const settings={festival_date:'2027-04-25T09:00:00',festival_address:'Toshkent',ticket_price:'10000',payment_card:'8600 0000 0000 0000'}
        const key=route.request().postDataJSON().filters?.find(x=>x.column==='key')?.value
        return json({data:key&&settings[key]?[{key,value:settings[key]}]:[],error:null})
      }
      if(table==='users')return json({data:[{telegram_id:1,phone:'+998901234567',first_name:'Festival mehmoni',created_at:'2026-10-26T00:00:00Z'}],error:null})
      return json({data:[],error:null})
    }
    return json({message:'Unexpected test request'},404)
  })
  return requests
}
async function login(page) {
  await page.goto('/')
  await page.getByRole('button',{name:'Telegram orqali kirish'}).click()
  await page.getByLabel('Kirish kodi',{exact:true}).fill('123456')
  await page.getByRole('button',{name:'Hisobga kirish',exact:true}).click()
}
test('mobile login has clear entry, paste-friendly code input, and recoverable errors',async({page})=>{
  const external=await stubApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Festivalga xush kelibsiz'})).toBeVisible()
  await page.screenshot({path:'.local/playwright/login-mobile.png',fullPage:true})
  await page.getByRole('button',{name:'Telegram orqali kirish'}).click()
  await expect(page.getByRole('heading',{name:'Telegramdagi kodni kiriting'})).toBeVisible()
  const input=page.getByLabel('Kirish kodi',{exact:true})
  await input.fill('654321')
  await page.getByRole('button',{name:'Hisobga kirish',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('Kod noto‘g‘ri')
  await expect(input).toHaveValue('654321')
  expect(external.some(host=>host.endsWith('supabase.co'))).toBe(false)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
test('member signs in, opens their profile, and signs out without storing tokens in web storage',async({page})=>{
  await stubApi(page)
  await page.addInitScript(()=>sessionStorage.setItem('splash_shown','true'))
  await login(page)
  await page.goto('/profile')
  // A page reload has no mock cookie, so perform a new sign-in on this route.
  await page.getByRole('button',{name:'Telegram orqali kirish'}).click()
  await page.getByLabel('Kirish kodi',{exact:true}).fill('123456')
  await page.getByRole('button',{name:'Hisobga kirish',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Festival mehmoni',exact:true})).toBeVisible()
  const stored=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))
  expect(stored).not.toContain('test_access_token')
  await page.getByRole('button',{name:'Hisobdan chiqish'}).click()
  await expect(page.getByRole('heading',{name:'Festivalga xush kelibsiz'})).toBeVisible()
})
test('verified administrator reaches the existing admin panel',async({page})=>{
  await stubApi(page,{admin:true})
  await page.addInitScript(()=>sessionStorage.setItem('splash_shown','true'))
  await login(page)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByText('Super admin',{exact:true})).toBeVisible()
  await page.screenshot({path:'.local/playwright/admin-mobile.png',fullPage:true})
})
