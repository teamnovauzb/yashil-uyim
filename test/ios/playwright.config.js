import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir:'.',workers:1,reporter:[['list'],['json',{outputFile:'../../.local/playwright/ios-web-report.json'}]],outputDir:'../../.local/playwright/ios-web-results',
  use:{...devices['iPhone 13'],baseURL:'http://127.0.0.1:4178',trace:'retain-on-failure'},
  webServer:{command:'node node_modules/vite/bin/vite.js preview --outDir .local/dist-public-ios --host 127.0.0.1 --port 4178 --strictPort',url:'http://127.0.0.1:4178',cwd:'../..',reuseExistingServer:false},
})
