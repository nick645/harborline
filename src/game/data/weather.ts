import type { Weather } from '../types'

/** Each route's weather holds for one slot, then shifts. */
export const WEATHER_SLOT_MS = 10 * 60 * 1000

export interface WeatherDef {
  id: Weather
  name: string
  /** Multiplies the trip's gross payout. */
  payoutMult: number
  /** Average condition lost per trip before the worn-hull multiplier; each trip rolls ±50%. */
  conditionCost: number
  /** Chance the trip is lost: no payout, no parts, the boat limps home at LOST_TRIP_CONDITION. */
  lossRisk: number
}

export const WEATHER: Record<Weather, WeatherDef> = {
  calm: { id: 'calm', name: 'Calm', payoutMult: 1.0, conditionCost: 1, lossRisk: 0 },
  choppy: { id: 'choppy', name: 'Choppy', payoutMult: 1.15, conditionCost: 3, lossRisk: 0 },
  rough: { id: 'rough', name: 'Rough', payoutMult: 1.3, conditionCost: 8, lossRisk: 0.02 },
  storm: { id: 'storm', name: 'Storm', payoutMult: 1.6, conditionCost: 20, lossRisk: 0.08 },
}

export const LOST_TRIP_CONDITION = 10

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

/** Seasons run back to back, a week each, starting from the Unix epoch so every player shares them. */
export const SEASON_LENGTH_MS = 7 * 24 * 60 * 60 * 1000
export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

/** Relative odds of each weather state, per season. Storms roughly double in winter. */
export const SEASON_WEATHER_ODDS: Record<Season, Record<Weather, number>> = {
  spring: { calm: 45, choppy: 30, rough: 17, storm: 8 },
  summer: { calm: 52, choppy: 28, rough: 14, storm: 6 },
  autumn: { calm: 42, choppy: 31, rough: 18, storm: 9 },
  winter: { calm: 32, choppy: 30, rough: 22, storm: 16 },
}
