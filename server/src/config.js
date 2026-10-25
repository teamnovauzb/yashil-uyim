import path from 'node:path'

export function configFromEnv(env = process.env) {
  const production = env.NODE_ENV === 'production'
  const required = name => {
    const value = env[name]
    if (!value || /change.?me|replace|example/i.test(value)) throw new Error(`Set ${name}`)
    return value
  }
  const secret = required('APP_SECRET')
  if (secret.length < 32) throw new Error('APP_SECRET must be at least 32 characters')
  const publicUrl = required('PUBLIC_URL').replace(/\/$/, '')
  if (production && !publicUrl.startsWith('https://')) throw new Error('PUBLIC_URL must use HTTPS')
  const botToken = required('BOT_TOKEN')
  const webhookSecret = required('TELEGRAM_WEBHOOK_SECRET')
  if (webhookSecret.length < 32 || !/^[\w-]+$/.test(webhookSecret)) throw new Error('Invalid webhook secret')
  if (!/^\w{5,32}$/.test(env.BOT_USERNAME || '')) throw new Error('Set BOT_USERNAME without @')
  const origins = new Set((env.ALLOWED_ORIGINS || publicUrl).split(',').map(x => x.trim()))
  if (origins.has('*') || origins.has('null')) throw new Error('Use explicit ALLOWED_ORIGINS')
  const port = Number(env.PORT || 3001)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  return {
    production, secret, publicUrl, botToken, webhookSecret, botUsername: env.BOT_USERNAME,
    origins, port, host: env.HOST || '127.0.0.1', databaseUrl: required('DATABASE_URL'),
    uploadDir: path.resolve(env.UPLOAD_DIR || './uploads'),
    bootstrapAdmins: (env.BOOTSTRAP_SUPER_ADMIN_IDS || '').split(',').filter(Boolean).map(x => {
      if (!/^[1-9]\d{0,15}$/.test(x.trim())) throw new Error('Invalid bootstrap admin ID')
      return x.trim()
    }),
  }
}
