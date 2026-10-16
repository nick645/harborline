// Storm alerts on the phone: local notifications worked out before the app goes to the
// background (see upcomingAlerts), and withdrawn when it comes back.

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import type { GameState } from '../../src/game/types'
import type { StormAlert } from '../../src/game/weather'
import { upcomingAlerts } from '../../src/game/alerts'
import { adriftDeadline } from '../../src/game/state'
import { getPort } from '../../src/game/economy'
import { WEATHER } from '../../src/game/data/weather'
import { duration } from '../../src/format'

const PREF_KEY = 'harborline.stormAlerts'
/** How far ahead to look when leaving: long enough to cover a full queue of the longest trips. */
const HORIZON_MS = 24 * 60 * 60 * 1000
/** Scheduled storm alerts carry this id prefix, so withdrawing them leaves anything else alone. */
const ALERT_ID = 'storm-'

// Show notifications that arrive while the app is open (scheduled alerts are withdrawn on
// return, so in practice this is the dev preview).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
})

export async function alertsWanted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREF_KEY)) === 'on'
  } catch {
    return false
  }
}

/** Turning alerts on asks for permission. Resolves to whether they're on afterwards. */
export async function setAlertsWanted(on: boolean): Promise<boolean> {
  if (on) {
    const current = await Notifications.getPermissionsAsync()
    const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted)
    if (!granted) on = false
  }
  if (!on) await cancelAlerts()
  await AsyncStorage.setItem(PREF_KEY, on ? 'on' : 'off').catch(() => undefined)
  return on
}

/** The words for an alert, shared by the notification and the in-app card. */
export function alertText(state: GameState, alert: StormAlert): { title: string; body: string } {
  const names = alert.boatIds.map((id) => state.player.ownedBoats.find((b) => b.id === id)?.nickname ?? 'A boat')
  const port = getPort(state.routes.find((r) => r.id === alert.routeId)!.portB).name
  const weather = WEATHER[alert.weather].name
  return {
    title: alert.inMs > 0 ? `${weather} reaching ${port} in ${duration(alert.inMs)}` : `${weather} over ${port}`,
    body: `${names.join(', ')} ${names.length === 1 ? 'has' : 'have'} trips queued there. Open Harborline to bring ${names.length === 1 ? 'her' : 'them'} home.`,
  }
}

/** Replace whatever was scheduled with the alerts due between now and the horizon. */
export async function scheduleAlerts(state: GameState, now: number): Promise<void> {
  await cancelAlerts()
  if (!(await alertsWanted())) return
  await scheduleAdrift(state, now)
  for (const alert of upcomingAlerts(state, now, now + HORIZON_MS)) {
    const { title, body } = alertText(state, alert)
    await Notifications.scheduleNotificationAsync({
      identifier: `${ALERT_ID}${alert.routeId}-${alert.at}`,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alert.at },
    })
  }
}

/** One warning an hour before a sunk boat's captain is lost, if she still isn't raised. */
async function scheduleAdrift(state: GameState, now: number) {
  for (const boat of state.player.ownedBoats) {
    const deadline = adriftDeadline(state, boat)
    const name = state.player.roster.find((c) => c.id === boat.captainId)?.name
    if (!deadline || !name) continue
    const at = Math.max(now + 60_000, deadline - 60 * 60 * 1000)
    if (at >= deadline) continue
    await Notifications.scheduleNotificationAsync({
      identifier: `${ALERT_ID}adrift-${boat.id}`,
      content: { title: `${name} is still clinging to ${boat.nickname}`, body: `Raise her within ${duration(deadline - at)} or they'll be lost at sea.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    })
  }
}

export async function cancelAlerts(): Promise<void> {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(
      pending.filter((n) => n.identifier.startsWith(ALERT_ID)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    )
  } catch {
    // Nothing scheduled, or notifications unavailable.
  }
}

/** Dev tool: the next real alert (or a made-up one), delivered in five seconds. */
export async function previewAlert(state: GameState, now: number): Promise<void> {
  const next = upcomingAlerts(state, now, now + HORIZON_MS, 1)[0]
  const { title, body } = next
    ? alertText(state, next)
    : alertText(state, { routeId: state.routes[0].id, weather: 'storm', inMs: 0, boatIds: [state.player.ownedBoats[0].id] })
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  })
}
