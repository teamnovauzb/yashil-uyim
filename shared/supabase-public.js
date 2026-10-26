import { publicColumns, publicSettingKeys, publishContent } from './public-content.js'

export async function readSupabasePublicContent({origin,key},fetchImpl=fetch,signal=AbortSignal.timeout(10000)) {
  const headers={apikey:key,...(key.startsWith('sb_publishable_')?{}:{Authorization:`Bearer ${key}`})}
  async function get(table,query) {
    const response=await fetchImpl(`${origin}/rest/v1/${table}?${query}`,{method:'GET',headers,credentials:'omit',redirect:'error',signal})
    if(!response.ok)throw new Error('Public content unavailable')
    const rows=await response.json()
    if(!Array.isArray(rows)||rows.length>1000||rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw new Error('Invalid public content')
    return rows
  }
  const data={}
  for(const [table,columns]of Object.entries(publicColumns))data[table]=await get(table,new URLSearchParams({select:columns.join(','),order:'id.asc',limit:'1000'}))
  data.settings=await get('settings',new URLSearchParams({select:'key,value',key:`in.(${publicSettingKeys.join(',')})`}))
  return publishContent(data)
}
