import { mkdir, writeFile, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { check } from './db.js'
import { digest, safeEqual } from './auth.js'

export function safePath(root, bucket, key) {
  check(['media', 'receipts'].includes(bucket), 'Invalid bucket')
  check(typeof key === 'string' && key.length <= 500 && !/[\\\0]/.test(key), 'Invalid file path')
  check(key.split('/').every(p => p && p !== '.' && p !== '..' && !p.includes(':')), 'Invalid file path')
  const base = path.resolve(root, bucket)
  const target = path.resolve(base, key)
  check(target.startsWith(base + path.sep), 'Invalid file path')
  return target
}

export function storageService(config) {
  const encode = key => key.split('/').map(encodeURIComponent).join('/')
  function url(bucket, key, signed = bucket === 'receipts' || key.startsWith('qr/')) {
    safePath(config.uploadDir, bucket, key)
    const base = `${config.publicUrl}/api/files/${bucket}/${encode(key)}`
    if (!signed) return base
    const expires = Math.floor(Date.now()/1000) + 900
    return `${base}?expires=${expires}&signature=${digest(config.secret, `${bucket}/${key}:${expires}`)}`
  }
  function signStored(value) {
    if (typeof value === 'string' && value.startsWith('file:')) {
      const [bucket, ...parts] = value.slice(5).split('/')
      return url(bucket, parts.join('/'))
    }
    return value
  }
  return {
    url, signStored,
    decorate(row) {
      if (Array.isArray(row)) return row.map(x => this.decorate(x))
      if (!row || typeof row !== 'object' || row instanceof Date) return row
      return Object.fromEntries(Object.entries(row).map(([k,v]) => [k, typeof v === 'string' && k.endsWith('_url') ? signStored(v) : this.decorate(v)]))
    },
    async receipt(buffer) {
      check(buffer.length > 0 && buffer.length <= 8*1024*1024, 'Receipt must be at most 8 MB')
      let normalized
      try { normalized = await sharp(buffer, { limitInputPixels: 25000000, animated: false }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer() }
      catch { check(false, 'Upload a valid receipt image') }
      const key = `${randomUUID()}.jpg`
      const target = safePath(config.uploadDir, 'receipts', key)
      await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, normalized, { flag: 'wx' })
      return { stored: `file:receipts/${key}`, key }
    },
    async media(buffer, key) {
      check(buffer.length <= 50*1024*1024, 'Media must be at most 50 MB')
      check(/^(gallery|news|programs|misc)\//.test(key), 'Invalid media folder')
      let content = buffer
      const ext = path.extname(key).toLowerCase()
      if (['.jpg','.jpeg','.png','.webp'].includes(ext)) {
        try {
          const image = sharp(buffer, { limitInputPixels: 40000000, animated: false }).rotate()
          content = await (ext === '.png' ? image.png() : ext === '.webp' ? image.webp() : image.jpeg()).toBuffer()
        } catch { check(false, 'Invalid image') }
      } else {
        const mp4 = ['.mp4','.mov'].includes(ext) && buffer.subarray(4,8).toString() === 'ftyp'
        const webm = ext === '.webm' && buffer.subarray(0,4).toString('hex') === '1a45dfa3'
        check(mp4 || webm, 'Unsupported media type')
      }
      const target = safePath(config.uploadDir, 'media', key)
      await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content, { flag: 'wx' })
      return { path: key, publicUrl: url('media',key), stored: `file:media/${key}` }
    },
    async remove(bucket, key) { await unlink(safePath(config.uploadDir,bucket,key)).catch(e => { if(e.code!=='ENOENT') throw e }) },
    async read(bucket, key, query) {
      const target = safePath(config.uploadDir,bucket,key)
      if (bucket === 'receipts' || key.startsWith('qr/')) {
        const expires = Number(query.expires)
        check(Number.isInteger(expires) && expires >= Date.now()/1000 && expires <= Date.now()/1000+1000 && safeEqual(query.signature, digest(config.secret, `${bucket}/${key}:${expires}`)), 'File link expired', 403)
      }
      if (key.startsWith('qr/live_') && key.endsWith('.png')) {
        const token = key.slice('qr/live_'.length, -4)
        check(/^[\w-]{22}$/.test(token), 'Invalid QR token')
        return { buffer: await QRCode.toBuffer(token, { width: 600, margin: 2 }), type: 'image/png' }
      }
      const types = {'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm'}
      const info=await stat(target);check(info.isFile(),'File not found',404)
      return { filePath: target, size: info.size, type: types[path.extname(key).toLowerCase()] || 'application/octet-stream' }
    },
    storedFromPublic(value) {
      if (value === null || value === '') return value
      check(typeof value === 'string', 'Invalid media URL')
      if (value.startsWith('file:media/') && !value.startsWith('file:media/qr/')) { safePath(config.uploadDir,'media',value.slice(11)); return value }
      let parsed
      try { parsed = new URL(value) } catch { check(false, 'Invalid media URL') }
      check(parsed.origin === new URL(config.publicUrl).origin && parsed.pathname.startsWith('/api/files/media/'), 'Use an uploaded media file')
      const key = decodeURIComponent(parsed.pathname.slice('/api/files/media/'.length))
      check(!key.startsWith('qr/'), 'Invalid media URL'); safePath(config.uploadDir,'media',key)
      return `file:media/${key}`
    },
  }
}
