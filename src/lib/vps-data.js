import { apiJson } from './session'

// Compatibility surface for existing screens. All permissions are enforced by the server.
class Query {
  constructor(table) { this.table=table;this.query={action:'select',filters:[],orders:[]};this.one=false;this.optional=false }
  select() { return this }
  eq(column,value) { this.query.filters.push({column,op:'eq',value});return this }
  in(column,value) { this.query.filters.push({column,op:'in',value});return this }
  order(column,{ascending=true}={}) { this.query.orders.push({column,ascending});return this }
  insert(values) { this.query.action='insert';this.query.values=values;return this }
  update(values) { this.query.action='update';this.query.values=values;return this }
  upsert(values) { this.query.action='upsert';this.query.values=values;return this }
  delete() { this.query.action='delete';return this }
  single() { this.one=true;return this }
  maybeSingle() { this.one=true;this.optional=true;return this }
  then(resolve,reject) { return this.execute().then(resolve,reject) }
  async execute() {
    try {
      let rows=[],offset=0
      do {
        const result=await apiJson(`/api/data/${this.table}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...this.query,limit:1000,offset})})
        rows.push(...result.data)
        if(this.query.action!=='select'||result.data.length<1000||this.one) break
        offset+=1000
      } while(offset<100000)
      if(this.one && (rows.length>1||(!rows.length&&!this.optional))) throw new Error('Record not found or not unique')
      return {data:this.one?(rows[0]||null):rows,error:null}
    } catch(error) { return {data:null,error:{message:error.message}} }
  }
}
const uploaded=new Map()
export const vpsData={
  from:table=>new Query(table),
  storage:{from:bucket=>({
    async upload(path,file) {
      try {
        if(bucket!=='media') throw new Error('Use ticket checkout for private receipts')
        const form=new FormData();form.set('path',path);form.set('file',file)
        const data=await apiJson('/api/storage/media',{method:'POST',body:form})
        uploaded.set(path,data.publicUrl);return {data,error:null}
      } catch(error){return {data:null,error:{message:error.message}}}
    },
    getPublicUrl(path) {return {data:{publicUrl:uploaded.get(path)}}},
    async remove(paths) {
      try{return await apiJson('/api/storage/media',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({paths})})}
      catch(error){return {data:null,error:{message:error.message}}}
    },
  })},
}
