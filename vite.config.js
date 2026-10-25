import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const vps = mode === 'vps' || env.VITE_BACKEND === 'vps'
  return {
    plugins: [react(), tailwindcss(), ...(vps ? [{ name: 'vps-mobile-viewport', transformIndexHtml: html => html.replace('width=device-width, initial-scale=1.0, user-scalable=no', 'width=device-width, initial-scale=1.0, viewport-fit=cover') }] : [])],
    define: { 'import.meta.env.VITE_BACKEND': JSON.stringify(vps ? 'vps' : 'legacy') },
    ...(vps ? { server: { proxy: { '/api': { target: env.VPS_DEV_PROXY || 'http://127.0.0.1:3001', changeOrigin: false } } } } : {}),
  }
})
