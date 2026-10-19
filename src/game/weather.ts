// Route weather and seasons. Pure functions of time: no stored history.

import type { GameState, Weather } from './types'
import { SEASON_LENGTH_MS, SEASON_ORDER, SEASON_WEATHER_ODDS, WEATHER_SLOT_MS, type Season } from './data/weather'
import { weatherRoll } from './rolls'
import { ROUTES } from './data/routes'
import { PORTS, getRegion } from './data/ports'
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

const ROUTE_LEAN = new Map(
  ROUTES.map((r) => [r.id, getRegion(PORTS.find((p) => p.id === r.portB)!.region).weather] as const).filter(([, w]) => w.calm !== 1 || w.storm !== 1),
)

/** The sea's own weather on a route at time t, before any boat ability bends it. */
export function naturalWeather(seed: number, routeId: string, t: number): Weather {
  const slot = weatherSlot(t)
  const season = SEASON_WEATHER_ODDS[seasonAt(slot * WEATHER_SLOT_MS)]
  // Each region's sea leans its own way against the season (the home bay doesn't).
  const lean = ROUTE_LEAN.get(routeId)
  const odds = lean ? { calm: season.calm * lean.calm, choppy: season.choppy * lean.choppy, rough: season.rough * lean.rough, storm: season.storm * lean.storm } : season
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

/** The weather a route will have over the next `slots` weather changes (Weather Radar). */
export function forecast(state: GameState, routeId: string, t: number, slots: number): Weather[] {
  return Array.from({ length: slots }, (_, k) => routeWeather(state, routeId, (weatherSlot(t) + k + 1) * WEATHER_SLOT_MS))
}

export interface StormAlert {
  routeId: string
  weather: Weather
  /** 0 when the weather has just turned; otherwise how far ahead the radar saw it coming. */
  inMs: number
  /** Boats with trips still queued on this route, which will sail into it unless called home. */
  boatIds: string[]
}

const SEVERITY: Record<Weather, number> = { calm: 0, choppy: 1, rough: 2, storm: 3 }

/**
 * Routes whose weather turns rough or stormy (worse than the slot before), with boats that
 * still have trips queued there. Without radar, only weather that has just arrived at `at`
 * is reported; each level of Weather Radar sees one more change ahead.
 */
export function stormAlerts(state: GameState, at: number, radarSlots = 0): StormAlert[] {
  const alerts: StormAlert[] = []
  for (const route of state.routes) {
    const boatIds = state.voyages.filter((v) => v.routeId === route.id && v.tripIndex < v.tripsTotal).map((v) => v.boatId)
    if (!boatIds.length) continue
    for (let k = 0; k <= radarSlots; k++) {
      const turnAt = at + k * WEATHER_SLOT_MS
      const now = routeWeather(state, route.id, turnAt)
      const before = routeWeather(state, route.id, turnAt - 1)
      if (SEVERITY[now] >= SEVERITY.rough && SEVERITY[now] > SEVERITY[before]) {
        alerts.push({ routeId: route.id, weather: now, inMs: k * WEATHER_SLOT_MS, boatIds })
        break
      }
    }
  }
  return alerts
}
