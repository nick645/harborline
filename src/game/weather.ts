// Route weather and seasons. Pure functions of time: no stored history.

import type { GameState, Weather } from './types'
import { SEASON_LENGTH_MS, SEASON_ORDER, SEASON_WEATHER_ODDS, WEATHER_SLOT_MS, type Season } from './data/weather'
import { weatherRoll } from './rolls'
import { abilityOf } from './abilities'

export function seasonAt(t: number): Season {
  const i = Math.floor(t / SEASON_LENGTH_MS) % SEASON_ORDER.length
  return SEASON_ORDER[(i + SEASON_ORDER.length) % SEASON_ORDER.length]
}

/** When the current season ends. */
export function seasonEndsAt(t: number): number {
  return (Math.floor(t / SEASON_LENGTH_MS) + 1) * SEASON_LENGTH_MS
}

export function weatherSlot(t: number): number {
  return Math.floor(t / WEATHER_SLOT_MS)
}

/** When the current weather slot ends. */
export function weatherChangesAt(t: number): number {
  return (weatherSlot(t) + 1) * WEATHER_SLOT_MS
}

/** The sea's own weather on a route at time t, before any boat ability bends it. */
export function naturalWeather(seed: number, routeId: string, t: number): Weather {
  const slot = weatherSlot(t)
  const odds = SEASON_WEATHER_ODDS[seasonAt(slot * WEATHER_SLOT_MS)]
  const total = odds.calm + odds.choppy + odds.rough + odds.storm
  let r = weatherRoll(seed, routeId, slot) * total
  for (const w of ['calm', 'choppy', 'rough', 'storm'] as const) {
    if (r < odds[w]) return w
    r -= odds[w]
  }
  return 'storm'
}

/** Weather a boat departing on this route at time t would sail into. */
export function routeWeather(state: GameState, routeId: string, t: number): Weather {
  // A boat whose ability drags storms along turns any route it is running into a storm.
  const stormBringer = state.voyages.some(
    (v) => v.routeId === routeId && abilityOf(state.player.ownedBoats.find((b) => b.id === v.boatId))?.hooks.bringsStorms,
  )
  return stormBringer ? 'storm' : naturalWeather(state.rng.seed, routeId, t)
}
