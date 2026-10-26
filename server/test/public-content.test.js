import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publishContent } from '../src/public-content.js'

test('public projection rejects private assets and cannot export account/payment fields',()=>{
  const result=publishContent({
    programs:[{id:1,title:'Public',phone:'private phone',chat_id:99,image_url:'file:receipts/private.jpg'}],
    news:[{id:1,title:'Public news',content:'Text',receipt_url:'private',image_url:'https://content.test/api/files/media/qr/token.png?signature=secret'}],
    gallery:[{id:1,media_type:'image',media_url:'file:media/gallery/photo.jpg',ticket_id:42}],
    settings:[{key:'festival_address',value:'Public venue'},{key:'payment_card',value:'private card'},{key:'BOT_TOKEN',value:'private bot token'}],
  },value=>value.startsWith('file:')?'https://content.test/api/files/'+value.slice(5):value)
  assert.equal(result.programs[0].image_url,null);assert.equal(result.news[0].image_url,null)
  assert.equal(result.gallery[0].media_url,'https://content.test/api/files/media/gallery/photo.jpg')
  assert.deepEqual(result.settings,{festival_address:'Public venue'})
  const json=JSON.stringify(result)
  for(const value of ['private phone','private card','private bot token','chat_id','ticket_id','receipt_url'])assert.ok(!json.includes(value))
})
