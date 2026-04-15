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

// Open external URL — uses Telegram's native opener when inside the mini app
export function openExternal(url) {
  try {
    if (tg?.openLink) {
      tg.openLink(url, { try_instant_view: false })
      return
    }
  } catch {}
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function showBackButton(onClick) {
  if (!tg?.BackButton) return () => {}
  const handler = () => { try { onClick() } catch {} }
  tg.BackButton.onClick(handler)
  tg.BackButton.show()
  return () => {
    try { tg.BackButton.offClick(handler); tg.BackButton.hide() } catch {}
  }
}

export function hideBackButton() {
  try { tg?.BackButton?.hide() } catch {}
}

export function closeMiniApp() {
  try {
    window.Telegram.WebApp.close()
  } catch (e) {
    console.log('close error', e)
  }
}

// Auto-request phone — shows Telegram share popup
export function requestPhone(callback) {
  if (!tg || !tg.requestContact) return

  // Listen for the contactRequested event
  tg.onEvent('contactRequested', (data) => {
    if (data.status === 'sent') {
      const phone =
        data.contact?.phone_number ||
        data.responseUnsafe?.contact?.phone_number
      if (phone) {
        callback(phone.startsWith('+') ? phone : '+' + phone)
      }
    }
  })

  tg.requestContact()
}
