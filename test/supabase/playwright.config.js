import { defineConfig, devices } from '@playwright/test'
const key='e30.eyJyb2xlIjoiYW5vbiJ9.test-signature'
export default defineConfig({
  testDir:'.',testMatch:'guest.spec.js',workers:1,reporter:'list',outputDir:'../../.local/playwright/supabase-results',
  use:{...devices['Pixel 7'],channel:'chrome',baseURL:'http://127.0.0.1:4176',trace:'retain-on-failure'},
  webServer:{command:'npm run dev:public -- --host 127.0.0.1 --port 4176 --strictPort',url:'http://127.0.0.1:4176',cwd:'../..',reuseExistingServer:false,env:{VITE_PUBLIC_CONTENT_SOURCE:'supabase',VITE_PUBLIC_SUPABASE_URL:'https://public-test.supabase.co',VITE_PUBLIC_SUPABASE_KEY:key}},
})
