// Storm alerts on the phone: local notifications worked out before the app goes to the
// background (see upcomingAlerts), and withdrawn when it comes back.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { RATING_TITLES, TITLE_MARKS } from '../../src/game/data/captains'
import * as Notifications from 'expo-notifications'
import type { GameState } from '../../src/game/types'
import type { StormAlert } from '../../src/game/weather'
import { upcomingAlerts } from '../../src/game/alerts'
import { adriftDeadline, settleAway } from '../../src/game/state'
import { getPart, partName, setProgress } from '../../src/game/parts'
import { getKeepsake } from '../../src/game/data/keepsakes'
import { getPort } from '../../src/game/economy'
import { WEATHER } from '../../src/game/data/weather'
import { WEATHER_WORDS, getRegion } from '../../src/game/data/ports'
import { getPortDef } from '../../src/game/regions'
import { duration } from '../../src/format'

const PREF_KEY = 'harborline.stormAlerts'
/** How far ahead to look when leaving: long enough to cover a full queue of the longest trips. */
const HORIZON_MS = 24 * 60 * 60 * 1000
/** Scheduled storm alerts carry this id prefix, so withdrawing them leaves anything else alone. */
const ALERT_ID = 'storm-'
/** Find alerts: their own switch, and their own prefix. */
const FIND_PREF_KEY = 'harborline.findAlerts'
const FIND_ID = 'find-'

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
  const portId = state.routes.find((r) => r.id === alert.routeId)!.portB
  const port = getPort(portId).name
  // Named for its climate: a squall off the shoals, a blizzard under the cliffs, a sandstorm.
  const climate = getRegion(getPortDef(portId).region).climate
  const word = alert.weather === 'rough' || alert.weather === 'storm' ? WEATHER_WORDS[climate][alert.weather] : WEATHER[alert.weather].name.toLowerCase()
  const weather = word[0].toUpperCase() + word.slice(1)
  return {
    title: alert.inMs > 0 ? `${weather} reaching ${port} in ${duration(alert.inMs)}` : `${weather} over ${port}`,
    body: `${names.join(', ')} ${names.length === 1 ? 'has' : 'have'} trips queued there. Open Harborline to bring ${names.length === 1 ? 'her' : 'them'} home.`,
  }
}

export async function findAlertsWanted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FIND_PREF_KEY)) === 'on'
  } catch {
    return false
  }
}

/** Turning find alerts on asks for permission. Resolves to whether they're on afterwards. */
export async function setFindAlertsWanted(on: boolean): Promise<boolean> {
  if (on) {
    const current = await Notifications.getPermissionsAsync()
    const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted)
    if (!granted) on = false
  }
  await AsyncStorage.setItem(FIND_PREF_KEY, on ? 'on' : 'off').catch(() => undefined)
  return on
}

/**
 * What the fleet will bring home while you're away that's worth a notification: rare, legendary
 * and mythic parts, keepsakes, and captains rising to a new title. The game's rolls are seeded, so running the queued trips
 * forward on a copy says exactly what comes home, and when, if nothing changes.
 */
function upcomingFinds(state: GameState, now: number): { at: number; title: string; body: string }[] {
  const { report } = settleAway(state, now + HORIZON_MS)
  const titles = report.titles.map((x) => ({ at: x.at, title: `${x.name} is now a ${RATING_TITLES[x.to]}!`, body: `A new title, and ${TITLE_MARKS[x.to].toLowerCase()} to show for it. Come and see.` }))
  return report.finds.filter((f) => f.keepsake || (f.part && getPart(f.part).rarity !== 'standard'))
    .map((f) => {
      if (f.keepsake) return { at: f.at, title: `${f.boat} brought something home`, body: `${getKeepsake(f.keepsake)?.name}: something new for your house.` }
      const part = getPart(f.part!)
      const set = setProgress(state.player.partInventory.concat(f.part!), f.part!)
      const rare = part.rarity === 'mythic' ? 'A mythic find!' : part.rarity === 'legendary' ? 'A legendary find!' : 'A rare find'
      return { at: f.at, title: `${rare} ${f.boat} found ${partName(f.part!)}`, body: set && set.need > 1 ? `${set.have} of ${set.need} for the ${set.boat}.` : 'Open Harborline to see it in your Workshop.' }
    })
    .concat(titles)
}

/** Replace whatever was scheduled with the alerts due between now and the horizon. */
export async function scheduleAlerts(state: GameState, now: number): Promise<void> {
  await cancelAlerts()
  if (await findAlertsWanted()) {
    for (const f of upcomingFinds(state, now)) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${FIND_ID}${f.at}-${f.title.length}`,
        content: { title: f.title, body: f.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: f.at },
      })
    }
  }
  if (!(await alertsWanted())) return
  await scheduleAdrift(state, now)
  await scheduleMorale(state, now)
  for (const alert of upcomingAlerts(state, now, now + HORIZON_MS)) {
    const { title, body } = alertText(state, alert)
    await Notifications.scheduleNotificationAsync({
      identifier: `${ALERT_ID}${alert.routeId}-${alert.at}`,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alert.at },
    })
  }
}

/** Captains coming close to quitting, and resigning, while you're away (the seeded run forward). */
async function scheduleMorale(state: GameState, now: number) {
  const { report } = settleAway(state, now + HORIZON_MS)
  const notes = [
    ...report.shaken.map((x) => ({ at: x.at, title: `${x.name} is close to quitting`, body: 'Bad voyages have worn them down. Calm, safe trips would steady them.' })),
    ...report.resigned.map((x) => ({ at: x.at, title: `${x.name} has resigned`, body: `They've signed with ${x.rival}.` })),
  ]
  for (const n of notes) {
    if (n.at <= now) continue
    await Notifications.scheduleNotificationAsync({
      identifier: `${ALERT_ID}morale-${n.at}-${n.title.length}`,
      content: { title: n.title, body: n.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at },
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
      pending.filter((n) => n.identifier.startsWith(ALERT_ID) || n.identifier.startsWith(FIND_ID)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
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
