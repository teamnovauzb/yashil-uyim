import crypto from 'node:crypto'
import QRCode from 'qrcode'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

export function generateToken() {
  return crypto.randomBytes(16).toString('base64url')
}

export async function generateAndStoreQr(token, ticketNumber) {
  const buffer = await QRCode.toBuffer(token, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 600,
    color: { dark: '#012d1d', light: '#FFFFFF' },
  })

  const path = `qr/qr_${ticketNumber}_${Date.now()}.png`
  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/media/${path}`, {
    method: 'POST',
    headers: {
      'apikey':         SUPABASE_KEY,
      'Authorization':  `Bearer ${SUPABASE_KEY}`,
      'Content-Type':   'image/png',
      'x-upsert':       'true',
    },
    body: buffer,
  })

  if (!upload.ok) {
    const text = await upload.text().catch(() => '')
    throw new Error(`QR upload failed: ${upload.status} ${text}`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/media/${path}`
}
