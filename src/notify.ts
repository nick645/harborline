// Browser delivery for storm alerts. In the Expo build these become local notifications.

const PREF_KEY = 'harborline.stormAlerts'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function alertsWanted(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === 'on'
  } catch {
    return false
  }
}

export function setAlertsWanted(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? 'on' : 'off')
  } catch {
    // Preference just won't persist.
  }
}

/** Must be called from a user gesture. Resolves true if notifications may be shown. */
export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export function systemNotify(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const n = new Notification(title, { body, tag: 'harborline-storm' })
  n.onclick = () => {
    window.focus()
    n.close()
  }
}
