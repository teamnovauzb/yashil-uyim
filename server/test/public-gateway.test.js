import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPublicGateway } from '../src/public-gateway.js'
import { publicSourceConfig } from '../src/public-source.js'
import { publicColumns, publicSettingKeys } from '../src/public-content.js'

const anonKey=`e30.${Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')}.test-signature`
const sourceEnv={GUEST_SUPABASE_URL:'https://current-project.supabase.co',GUEST_SUPABASE_PUBLIC_KEY:anonKey}
const origins=new Set(['https://localhost','capacitor://localhost'])
function upstream() {
  const calls=[],rows={
    programs:[{id:1,title:'Upcoming festival',phone:'private',image_url:null}],
    news:[{id:2,title:'Current announcement',content:'Published news',image_url:'file:receipts/hidden.jpg'}],
    gallery:[{id:3,media_type:'image',media_url:'https://content.test/gallery/photo.jpg',chat_id:55}],
    settings:[{key:'festival_address',value:'Public venue'},{key:'payment_card',value:'hidden card'}],
  }
  return {calls,rows,fetchImpl:async(url,options)=>{
    calls.push({url:new URL(url),options})
    return {ok:true,json:async()=>rows[new URL(url).pathname.split('/').at(-1)]}
  }}
}
test('gateway reads current Supabase public columns with GET only and strips private data',async t=>{
  const mock=upstream(),app=await buildPublicGateway({config:publicSourceConfig(sourceEnv),origins,fetchImpl:mock.fetchImpl})
  t.after(()=>app.close())
  const response=await app.inject({url:'/api/public/content',headers:{origin:'https://localhost',authorization:'Bearer user-private-token',cookie:'user=private'}})
  assert.equal(response.statusCode,200,response.payload)
  assert.equal(response.headers['access-control-allow-origin'],'https://localhost')
  assert.notEqual(response.headers['access-control-allow-credentials'],'true')
  assert.equal(response.json().programs[0].title,'Upcoming festival')
  assert.deepEqual(response.json().settings,{festival_address:'Public venue'})
  assert.equal(mock.calls.length,4)
  for(const {url,options}of mock.calls) {
    const table=url.pathname.split('/').at(-1)
    assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error')
    assert.equal(options.headers.Authorization,`Bearer ${anonKey}`)
    assert.ok(!options.headers.cookie)
    assert.equal(url.origin,sourceEnv.GUEST_SUPABASE_URL)
    assert.equal(url.searchParams.get('select'),table==='settings'?'key,value':publicColumns[table].join(','))
    if(table==='settings')assert.equal(url.searchParams.get('key'),`in.(${publicSettingKeys.join(',')})`)
  }
  for(const value of ['private','hidden card','receipts','chat_id'])assert.ok(!response.payload.includes(value))
})
test('gateway coalesces concurrent reads and refreshes its short cache for upcoming content',async t=>{
  const mock=upstream();let time=1000
  const app=await buildPublicGateway({config:publicSourceConfig(sourceEnv),origins,fetchImpl:mock.fetchImpl,now:()=>time})
  t.after(()=>app.close())
  const responses=await Promise.all(Array.from({length:3},()=>app.inject('/api/public/content')))
  assert.ok(responses.every(response=>response.statusCode===200));assert.equal(mock.calls.length,4)
  mock.rows.news[0].title='New upcoming activity'
  await app.inject('/api/public/content');assert.equal(mock.calls.length,4)
  time+=31000
  const refreshed=await app.inject('/api/public/content')
  assert.equal(refreshed.json().news[0].title,'New upcoming activity');assert.equal(mock.calls.length,8)
})
test('the identical mobile endpoint can use VPS data after server configuration changes',async t=>{
  const calls=[],config=publicSourceConfig({PUBLIC_CONTENT_SOURCE:'vps',GUEST_API_ORIGIN:'https://guest.test',GUEST_VPS_ORIGIN:'https://vps.test'})
  const app=await buildPublicGateway({config,origins,fetchImpl:async(url,options)=>{
    calls.push({url,options})
    return {ok:true,json:async()=>({version:1,updated_at:'2026-10-26T09:00:00Z',programs:[{id:1,title:'Migrated festival',receipt_url:'private'}],news:[],gallery:[],settings:{festival_address:'Same venue',payment_card:'private'}})}
  }})
  t.after(()=>app.close())
  const response=await app.inject({url:'/api/public/content',headers:{origin:'capacitor://localhost',authorization:'Bearer private',cookie:'private'}})
  assert.equal(response.statusCode,200,response.payload)
  assert.equal(response.json().programs[0].title,'Migrated festival')
  assert.equal(calls[0].url,'https://vps.test/api/public/content')
  assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.credentials,'omit')
  assert.deepEqual(calls[0].options.headers,{})
  assert.ok(!response.payload.includes('private'))
})
test('gateway exposes no registration, login, writes, arbitrary upstream query, or private routes',async t=>{
  const mock=upstream(),app=await buildPublicGateway({config:publicSourceConfig(sourceEnv),origins,fetchImpl:mock.fetchImpl})
  t.after(()=>app.close())
  for(const url of ['/api/auth/start','/api/register','/api/data/users','/api/admin','/api/tickets'])assert.equal((await app.inject({method:'POST',url,payload:{}})).statusCode,404)
  assert.equal((await app.inject({method:'POST',url:'/api/public/content',payload:{}})).statusCode,404)
  assert.equal((await app.inject('/api/public/content?table=users')).statusCode,400)
  assert.equal((await app.inject({url:'/api/public/content',headers:{origin:'https://untrusted.test'}})).statusCode,403)
  assert.equal(mock.calls.length,0)
})
test('failed or malformed upstream reads fail as a whole and do not become a successful cache entry',async t=>{
  let broken=true,calls=0
  const mock=upstream(),app=await buildPublicGateway({config:publicSourceConfig(sourceEnv),origins,fetchImpl:async(url,options)=>{
    calls++
    return broken?{ok:false,status:500,json:async()=>({secret:'must not be forwarded'})}:mock.fetchImpl(url,options)
  }})
  t.after(()=>app.close())
  const failed=await app.inject('/api/public/content')
  assert.equal(failed.statusCode,503);assert.ok(!failed.payload.includes('secret'))
  broken=false
  assert.equal((await app.inject('/api/public/content')).statusCode,200);assert.equal(calls,5)
  const malformedSource=upstream();malformedSource.rows.news=[{id:1,title:'Missing news body'}]
  const malformed=await buildPublicGateway({config:publicSourceConfig(sourceEnv),origins,fetchImpl:malformedSource.fetchImpl})
  t.after(()=>malformed.close())
  assert.equal((await malformed.inject('/api/public/content')).statusCode,503)
  const invalid=await buildPublicGateway({config:{source:'vps',origin:'https://vps.test'},origins,fetchImpl:async()=>({ok:true,json:async()=>({users:[{phone:'private'}]})})})
  t.after(()=>invalid.close())
  assert.equal((await invalid.inject('/api/public/content')).statusCode,503)
})
test('source configuration rejects secret/service-role keys, insecure origins, and self-proxy loops',()=>{
  assert.equal(publicSourceConfig({...sourceEnv,GUEST_SUPABASE_PUBLIC_KEY:'sb_publishable_test_key'}).source,'supabase')
  const roleKey=`e30.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.signature`
  for(const key of ['sb_secret_test_key',roleKey,'invalid'])assert.throws(()=>publicSourceConfig({...sourceEnv,GUEST_SUPABASE_PUBLIC_KEY:key}),/publishable\/anon/)
  for(const origin of ['http://project.test','https://user:pass@project.test','https://project.test/path'])assert.throws(()=>publicSourceConfig({...sourceEnv,GUEST_SUPABASE_URL:origin}),/HTTPS origin/)
  assert.throws(()=>publicSourceConfig({PUBLIC_CONTENT_SOURCE:'vps',GUEST_API_ORIGIN:'https://guest.test',GUEST_VPS_ORIGIN:'https://guest.test'}),/must differ/)
})
