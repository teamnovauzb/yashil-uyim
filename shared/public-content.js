// One explicit publication boundary for the guest client, public endpoint and read-only snapshot tool.
export const publicColumns = {
  programs:['id','title','description','speaker','category','image_url','start_time','end_time'],
  news:['id','title','content','image_url','published_at'],
  gallery:['id','media_type','media_url','thumbnail_url','caption','sort_order'],
}
export const publicSettingKeys=['festival_date','festival_address','festival_lat','festival_lng','festival_yandex_url']

export function publishContent({programs=[],news=[],gallery=[],settings=[]},resolveMedia=value=>value,updatedAt=new Date().toISOString()) {
  const media=value=>{
    if(typeof value!=='string'||!value)return null
    if(value.startsWith('file:')&&!/^file:media\/(gallery|news|programs|misc)\//.test(value))return null
    const resolved=resolveMedia(value)
    try {
      const url=new URL(resolved)
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null
      if(url.protocol==='http:'&&!['localhost','127.0.0.1'].includes(url.hostname))return null
      if(/\/(receipts|qr)\//i.test(decodeURIComponent(url.pathname)))return null
      if(['signature','token'].some(key=>url.searchParams.has(key)))return null
      return url.href
    }catch{return null}
  }
  const project=(table,rows)=>rows.map(row=>Object.fromEntries(publicColumns[table].map(key=>[key,key.endsWith('_url')?media(row[key]):row[key]??null])))
  return {
    version:1,updated_at:updatedAt,
    programs:project('programs',programs),news:project('news',news),gallery:project('gallery',gallery),
    settings:Object.fromEntries(settings.filter(row=>publicSettingKeys.includes(row.key)&&typeof row.value==='string').map(row=>[row.key,row.value])),
  }
}
