import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'legacy.spec.js',
  workers: 1,
  reporter: 'list',
  outputDir: '../../.local/playwright/legacy-results',
  use: { ...devices['Pixel 7'], channel: 'chrome', baseURL: 'http://127.0.0.1:4174' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    cwd: '../..',
    reuseExistingServer: false,
    env: { VITE_BACKEND: 'legacy', VITE_SUPABASE_URL: 'https://offline-fixture.supabase.invalid', VITE_SUPABASE_ANON_KEY: 'offline-fixture-only' },
  },
})
