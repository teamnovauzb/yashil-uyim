import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'uz.teamnova.yashiluyim',
  appName: 'Yashil Uyim',
  webDir: 'dist-vps',
  server: { androidScheme: 'https', hostname: 'localhost' },
  android: { allowMixedContent: false },
  ios: { contentInset: 'never', preferredContentMode: 'mobile' },
}
export default config
