import { publicColumns, publicSettingKeys, publishContent } from '../../shared/public-content.js'
export { publicColumns, publicSettingKeys, publishContent } from '../../shared/public-content.js'

export async function readPublicContent(db,storage) {
  const data={}
  // No users, tickets, receipts, feedback, roles, payment details, or arbitrary query parameters.
  for(const [table,order]of [['programs','start_time ASC,id ASC'],['news','published_at DESC,id DESC'],['gallery','sort_order DESC,id DESC']]) {
    data[table]=(await db.query(`SELECT ${publicColumns[table].join(',')} FROM ${table} ORDER BY ${order} LIMIT 1000`)).rows
  }
  data.settings=(await db.query('SELECT key,value FROM settings WHERE key=ANY($1::text[])',[publicSettingKeys])).rows
  return publishContent(data,value=>storage.signStored(value))
}
