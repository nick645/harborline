// Storm alerts ahead of time. Weather is a pure function of (seed, route, time) and settle() is
// deterministic, so the phone can work out every alert the player would get while away and hand
// them to the OS as local notifications before it closes. Nothing has to run in the background.

import type { GameState } from './types'
import { WEATHER_SLOT_MS } from './data/weather'
import { isAutomated, settle } from './state'
import { stormAlerts, weatherChangesAt, type StormAlert } from './weather'
import { upgradeValue } from './upgrades'

export interface UpcomingAlert extends StormAlert {
  /** When to tell the player: the weather turn at which this alert would be raised. */
  at: number
}

/**
 * Every storm alert the player would get from `from` until `until` if they don't touch the
 * game, at most `limit` of them. Each storm is reported once, at the first turn it's seen
 * (early with Weather Radar). Managed boats are left out: their managers keep them out of
 * rough water without being told.
 */
export function upcomingAlerts(state: GameState, from: number, until: number, limit = 60): UpcomingAlert[] {
  const radar = upgradeValue(state, 'weather-radar')
  const seen = new Set<string>()
  const out: UpcomingAlert[] = []
  let s = state
  for (let at = weatherChangesAt(from); at <= until && out.length < limit; at += WEATHER_SLOT_MS) {
    s = settle(s, at)
    if (!s.voyages.length) break
    for (const alert of stormAlerts(s, at, radar)) {
      const key = `${alert.routeId}@${at + alert.inMs}`
      if (seen.has(key)) continue
      seen.add(key)
      const boatIds = alert.boatIds.filter((id) => {
        const boat = s.player.ownedBoats.find((b) => b.id === id)
        return boat && !isAutomated(s, boat)
      })
      if (boatIds.length) out.push({ ...alert, boatIds, at })
      if (out.length >= limit) break
    }
  }
  return out
}
