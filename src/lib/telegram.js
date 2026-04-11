// Telegram Web App helper
export const tg = window.Telegram?.WebApp

export function initTelegram() {
  if (tg) {
    tg.ready()
    tg.expand()
  }
}

export function isTelegram() {
  return !!(window.Telegram?.WebApp)
}

export function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null
}

export function closeMiniApp() {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.close()
  }
}

// Request user phone number via Telegram popup
export function requestPhone(callback) {
  if (!tg) return
  tg.requestContact((ok, contact) => {
    if (ok && contact?.contact?.phone_number) {
      const phone = contact.contact.phone_number
      callback(phone.startsWith('+') ? phone : '+' + phone)
    }
  })
}
