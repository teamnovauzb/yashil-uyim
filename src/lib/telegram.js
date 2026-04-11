// Telegram Web App helper
export const tg = window.Telegram?.WebApp

export function initTelegram() {
  if (tg) {
    tg.ready()
    tg.expand() // open full screen
  }
}

export function isTelegram() {
  return !!window.Telegram?.WebApp?.initData
}

export function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null
}

export function closeMiniApp() {
  tg?.close()
}
