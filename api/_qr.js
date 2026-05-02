import crypto from 'node:crypto'
import QRCode from 'qrcode'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

export function generateToken() {
  return crypto.randomBytes(16).toString('base64url')
}

export async function generateAndStoreQr(token, ticketNumber, suffix = '') {
  const buffer = await QRCode.toBuffer(token, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 600,
    color: { dark: '#012d1d', light: '#FFFFFF' },
  })

  const path = `qr/qr_${ticketNumber}${suffix ? `_${suffix}` : ''}_${Date.now()}.png`
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

// Generate N seats, each with its own unique token + QR image.
// Returns: [{ seat_index, qr_token, qr_url }, ...]
export async function generateSeats(ticketNumber, count) {
  const total = Math.max(1, Number(count) || 1)
  const seats = []
  for (let i = 1; i <= total; i++) {
    const token = generateToken()
    const url = await generateAndStoreQr(token, ticketNumber, `s${i}`)
    seats.push({ seat_index: i, qr_token: token, qr_url: url })
  }
  return seats
}
