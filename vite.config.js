import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { publicSourceConfig } from './server/src/public-source.js'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const vps = mode === 'vps' || env.VITE_BACKEND === 'vps'
  const publicApp = mode === 'public'
  if (publicApp && command === 'build') {
    const source=env.VITE_PUBLIC_CONTENT_SOURCE||'api'
    if(!['api','supabase'].includes(source))throw new Error('Invalid VITE_PUBLIC_CONTENT_SOURCE')
    if(source==='supabase')publicSourceConfig({PUBLIC_CONTENT_SOURCE:'supabase',GUEST_SUPABASE_URL:env.VITE_PUBLIC_SUPABASE_URL?.replace(/\/$/,''),GUEST_SUPABASE_PUBLIC_KEY:env.VITE_PUBLIC_SUPABASE_KEY})
    else {
    const publicApi=env.VITE_PUBLIC_API_URL?.replace(/\/$/,'')
    if (!publicApi || !publicApi.startsWith('https://') || new URL(publicApi).origin !== publicApi) throw new Error('Set VITE_PUBLIC_API_URL to the guest VPS API HTTPS origin before building the public app')
    }
  }
  return {
    plugins: [react(), tailwindcss(), ...((vps || publicApp) ? [{ name: 'mobile-viewport', transformIndexHtml: {order:'pre',handler: html => {
      const viewport=html.replace('width=device-width, initial-scale=1.0, user-scalable=no', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
      return publicApp ? viewport.replace('/src/main.jsx','/src/public/main.jsx').replace('type="image/svg+xml" href="/favicon.svg"','type="image/jpeg" href="/assets/mobile/logo.jpg"').replace(/\s*<script src="https:\/\/telegram\.org\/js\/telegram-web-app\.js"><\/script>/,'').replace(/\s*<link rel="(?:preload|prefetch)" as="image" href="\/(?:intro|2|3)\.jpg"[^>]*>/g,'') : viewport
    }} }] : [])],
    ...(publicApp ? { build: { outDir: 'dist-public' } } : {}),
    define: { 'import.meta.env.VITE_BACKEND': JSON.stringify(vps ? 'vps' : 'legacy') },
    ...((vps || publicApp) ? { server: { proxy: { '/api': { target: env.VPS_DEV_PROXY || 'http://127.0.0.1:3001', changeOrigin: false } } } } : {}),
  }
})
