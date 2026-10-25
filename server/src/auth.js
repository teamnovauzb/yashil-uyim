import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { check, httpError } from './db.js'

export const randomToken = () => randomBytes(32).toString('base64url')
export const digest = (secret, value) => createHmac('sha256', secret).update(value).digest('hex')
export const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export function validateTelegram(initData, botToken, now = Date.now()) {
  check(typeof initData === 'string' && initData.length < 16384, 'Invalid Telegram login', 401)
  const params = new URLSearchParams(initData)
  check(new Set(params.keys()).size === [...params.keys()].length, 'Invalid Telegram login', 401)
  const hash = params.get('hash'); params.delete('hash')
  const key = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', key).update([...params].sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join('\n')).digest('hex')
  const age = now / 1000 - Number(params.get('auth_date'))
  check(safeEqual(hash, expected) && age >= -30 && age <= 300, 'Telegram login expired or invalid', 401)
  let user
  try { user = JSON.parse(params.get('user')) } catch { throw httpError(401, 'Invalid Telegram user') }
  check(Number.isSafeInteger(user?.id) && user.id > 0, 'Invalid Telegram user', 401)
  return user
}

export async function upsertTelegramUser(db, user) {
  await db.query(`INSERT INTO users(telegram_id,username,first_name,last_name) VALUES($1,$2,$3,$4)
    ON CONFLICT(telegram_id) DO UPDATE SET username=EXCLUDED.username,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name`,
    [String(user.id), user.username?.slice(0,64) || null, user.first_name?.slice(0,200) || null, user.last_name?.slice(0,200) || null])
}

export function authService(db, config, telegram) {
  const hash = value => digest(config.secret, value)
  async function issueSession(client, userId) {
    const access = randomToken(), refresh = randomToken(), sessionId = randomUUID()
    await client.query(`INSERT INTO sessions(id,telegram_id,access_hash,refresh_hash,access_expires_at,expires_at)
      VALUES($1,$2,$3,$4,now()+interval '15 minutes',now()+interval '30 days')`, [sessionId, userId, hash(access), hash(refresh)])
    return { access_token: access, refresh_token: refresh, expires_in: 900 }
  }
  async function userFor(access) {
    if (!access) return null
    const { rows } = await db.query(`SELECT u.*,s.id AS session_id,COALESCE(a.is_super,false) AS is_super,
      (a.telegram_id IS NOT NULL) AS is_admin FROM sessions s JOIN users u ON u.telegram_id=s.telegram_id
      LEFT JOIN admins a ON a.telegram_id=u.telegram_id WHERE s.access_hash=$1 AND s.revoked_at IS NULL
      AND s.access_expires_at>now() AND s.expires_at>now()`, [hash(access)])
    return rows[0] || null
  }
  return {
    userFor, issueSession,
    async start(verifier) {
      check(typeof verifier === 'string' && /^[\w-]{43}$/.test(verifier), 'Invalid login verifier')
      const challenge = randomBytes(24).toString('base64url')
      await db.query(`INSERT INTO login_challenges(id,verifier_hash,expires_at) VALUES($1,$2,now()+interval '5 minutes')`, [challenge, hash(verifier)])
      return { challenge, telegram_url: `https://t.me/${config.botUsername}?start=login_${challenge}`, expires_in: 300 }
    },
    async deliverCode(challenge, user, transactionClient = null) {
      const run = async client => {
        const { rows } = await client.query('SELECT * FROM login_challenges WHERE id=$1 FOR UPDATE', [challenge])
        const row = rows[0]
        if (!row || row.consumed_at || row.code_hash || new Date(row.expires_at).getTime() < Date.now()) return false
        const code = String(randomInt(100000, 1000000))
        await upsertTelegramUser(client, user)
        await client.query('UPDATE login_challenges SET telegram_id=$2,code_hash=$3 WHERE id=$1', [challenge, String(user.id), hash(`${challenge}:${code}`)])
        await telegram('sendMessage', { chat_id: user.id, text: `Yashil Uyim login kodi: ${code}\n\n5 daqiqa amal qiladi. Kodni faqat o‘zingiz ochgan Yashil Uyim ilovasiga kiriting. Uni hech kimga yubormang.` })
        return true
      }
      return transactionClient ? run(transactionClient) : db.transaction(run)
    },
    async verify({ challenge, verifier, code }) {
      check(typeof challenge === 'string' && typeof verifier === 'string' && /^\d{6}$/.test(code || ''), 'Invalid login code', 401)
      // Return errors AFTER commit, so wrong attempts cannot be rolled back.
      const result = await db.transaction(async client => {
        const { rows } = await client.query('SELECT * FROM login_challenges WHERE id=$1 FOR UPDATE', [challenge])
        const row = rows[0]
        if (!row || !safeEqual(row.verifier_hash, hash(verifier)) || row.consumed_at || row.attempts >= 5 || new Date(row.expires_at).getTime() < Date.now()) return null
        await client.query('UPDATE login_challenges SET attempts=attempts+1 WHERE id=$1', [challenge])
        if (!row.telegram_id || !safeEqual(row.code_hash, hash(`${challenge}:${code}`))) return null
        await client.query('UPDATE login_challenges SET consumed_at=now() WHERE id=$1', [challenge])
        return issueSession(client, row.telegram_id)
      })
      check(result, 'Code is invalid, expired, or used. Request a new code.', 401)
      return result
    },
    async refresh(token) {
      check(typeof token === 'string' && token.length === 43, 'Sign in again', 401)
      return db.transaction(async client => {
        const { rows } = await client.query('SELECT * FROM sessions WHERE refresh_hash=$1 AND revoked_at IS NULL AND expires_at>now() FOR UPDATE', [hash(token)])
        check(rows[0], 'Sign in again', 401)
        const access = randomToken(), refresh = randomToken()
        await client.query(`UPDATE sessions SET access_hash=$2,refresh_hash=$3,access_expires_at=now()+interval '15 minutes' WHERE id=$1`, [rows[0].id, hash(access), hash(refresh)])
        return { access_token: access, refresh_token: refresh, expires_in: 900 }
      })
    },
    async logout(token) { if (typeof token === 'string') await db.query('UPDATE sessions SET revoked_at=now() WHERE refresh_hash=$1', [hash(token)]) },
  }
}
