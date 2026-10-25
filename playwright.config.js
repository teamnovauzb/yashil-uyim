import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: '.local/playwright/results',
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', trace: 'retain-on-failure' },
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run dev:vps -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    env: { VITE_API_URL: '', VITE_BACKEND: 'vps' },
  },
})
