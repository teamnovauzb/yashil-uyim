import type { CapacitorConfig } from '@capacitor/cli'

const publicApp = process.env.YASHILUYIM_MOBILE_MODE !== 'vps'
const config: CapacitorConfig = {
  appId: 'uz.teamnova.yashiluyim',
  appName: 'Yashil Uyim',
  webDir: process.env.YASHILUYIM_MOBILE_WEB_DIR || (publicApp ? 'dist-public' : 'dist-vps'),
  ...(publicApp ? { includePlugins: ['@capacitor/app', '@capacitor/browser'] } : {}),
  server: { androidScheme: 'https', hostname: 'localhost' },
  android: { allowMixedContent: false },
  ios: { contentInset: 'never', preferredContentMode: 'mobile' },
}
export default config
