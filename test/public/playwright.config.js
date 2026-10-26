import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:'.',testMatch:'guest.spec.js',workers:1,reporter:'list',outputDir:'../../.local/playwright/public-results',
  use:{...devices['Pixel 7'],channel:'chrome',baseURL:'http://127.0.0.1:4175',trace:'retain-on-failure'},
  webServer:{command:'npm run dev:public -- --host 127.0.0.1 --port 4175 --strictPort',url:'http://127.0.0.1:4175',cwd:'../..',reuseExistingServer:false,env:{VITE_PUBLIC_API_URL:'',VITE_PUBLIC_CONTENT_SOURCE:'api'}},
})
