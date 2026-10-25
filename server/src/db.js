import pg from 'pg'

export function createDb(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000, statement_timeout: 15000 })
  return {
    query: (text, values) => pool.query(text, values),
    async transaction(fn) {
      const client = await pool.connect()
      try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result }
      catch (error) { await client.query('ROLLBACK'); throw error }
      finally { client.release() }
    },
    close: () => pool.end(),
  }
}

export async function audit(db, actor, action, entity, id, details = {}) {
  await db.query('INSERT INTO audit_log(actor_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5)',
    [actor || null, action, entity, String(id), JSON.stringify(details)])
}

export function httpError(statusCode, message) { return Object.assign(new Error(message), { statusCode }) }
export function check(condition, message, status = 400) { if (!condition) throw httpError(status, message) }
export function text(value, name, max = 200, min = 1) {
  check(typeof value === 'string' && value.trim().length >= min && value.trim().length <= max, `Invalid ${name}`)
  return value.trim()
}
export function id(value) { check(/^[1-9]\d{0,18}$/.test(String(value)), 'Invalid ID'); return String(value) }
