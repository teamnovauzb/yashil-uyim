import Fastify, { LogController } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { readPublicSource } from './public-source.js'

export async function buildPublicGateway({config,origins,fetchImpl=fetch,logger=false,now=Date.now}) {
  const app=Fastify({logger,bodyLimit:1024,trustProxy:1,logController:new LogController({disableRequestLogging:true})})
  if(!origins?.size||origins.has('*')||origins.has('null'))throw new Error('Set explicit GUEST_ALLOWED_ORIGINS')
  app.setErrorHandler((error,_request,reply)=>reply.code(error.statusCode||503).send({message:'Public content unavailable. Please try again.'}))
  await app.register(cors,{origin:(origin,callback)=>callback(null,!origin||origins.has(origin)),credentials:false,methods:['GET','HEAD','OPTIONS']})
  await app.register(helmet,{contentSecurityPolicy:false,crossOriginResourcePolicy:{policy:'cross-origin'}})
  await app.register(rateLimit,{max:120,timeWindow:'1 minute'})
  app.addHook('onRequest',async(request,reply)=>{
    if(request.headers.origin&&!origins.has(request.headers.origin))return reply.code(403).send({message:'Origin not allowed'})
  })
  let cache,inflight
  async function content() {
    if(cache&&cache.until>now())return cache.data
    if(!inflight)inflight=readPublicSource(config,fetchImpl).then(data=>{cache={data,until:now()+30000};return data}).finally(()=>{inflight=null})
    return inflight
  }
  app.get('/api/health',async()=>({ok:true,service:'yashil-uyim-public-gateway'}))
  app.get('/api/public/content',async(request,reply)=>{
    if(Object.keys(request.query).length)return reply.code(400).send({message:'Content query parameters are not supported'})
    const data=await content()
    return reply.header('Cache-Control','public, max-age=30').send(data)
  })
  return app
}
