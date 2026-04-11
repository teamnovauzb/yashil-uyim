// Telegram Web App helper
export const tg = window.Telegram?.WebApp

export function initTelegram() {
  if (tg) {
    tg.ready()
    tg.expand()
  }
}

// platform is 'unknown' in browser, real value in Telegram (android/ios/tdesktop/weba)
export function isTelegram() {
  const platform = window.Telegram?.WebApp?.platform
  return !!platform && platform !== 'unknown'
}

export function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null
}

export function closeMiniApp() {
  try {
    window.Telegram.WebApp.close()
  } catch (e) {
    console.log('close error', e)
  }
}

// Auto-request phone on mount — shows Telegram share popup
export function requestPhone(callback) {
  if (!tg || !tg.requestContact) return
  tg.requestContact((ok, contact) => {
    if (ok && contact?.contact?.phone_number) {
      const phone = contact.contact.phone_number
      callback(phone.startsWith('+') ? phone : '+' + phone)
    }
  })
}
