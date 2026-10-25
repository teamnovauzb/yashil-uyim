import { Capacitor } from '@capacitor/core'

export const usesVps = import.meta.env.VITE_BACKEND === 'vps'
export const isNative = Capacitor.isNativePlatform()
export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'')
if (usesVps && apiBase && !/^https:\/\//.test(apiBase) && !(import.meta.env.DEV && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(apiBase))) {
  throw new Error('VITE_API_URL must be an HTTPS origin')
}
if (usesVps && isNative && !apiBase) throw new Error('Native apps require VITE_API_URL')
