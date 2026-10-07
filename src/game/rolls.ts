// Every random roll in the game lives here. The RNG is seeded and its state is saved,
// so any bug report can be replayed exactly.

import type { PartRarity, RngState, Weather } from './types'
import { DEMAND_MAX, DEMAND_MIN, WEAR_MULTIPLIERS, WEATHER_DAMAGE_SPREAD } from './data/economy'
import { WEATHER } from './data/weather'

export function createRng(seed: number): RngState {
  const s = seed >>> 0
  return { seed: s, state: s }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0
}

/** mulberry32. Advances rng.state in place and returns a float in [0, 1). */
export function nextFloat(rng: RngState): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0
  return mix(rng.state)
}

function mix(x: number): number {
  let t = x >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
}

/** Integer in [min, max], inclusive. */
export function nextInt(rng: RngState, min: number, max: number): number {
  return min + Math.floor(nextFloat(rng) * (max - min + 1))
}

/** Route demand, 0.5–1.5, rounded to 2 decimals for display. */
export function rollDemand(rng: RngState, floor = DEMAND_MIN): number {
  const lo = Math.max(DEMAND_MIN, floor)
  const d = lo + nextFloat(rng) * (DEMAND_MAX - lo)
  return Math.round(d * 100) / 100
}

/** Condition lost on one trip: the weather's cost ±50%, sped up on worn hulls. */
export function rollConditionLoss(rng: RngState, weather: Weather, condition: number): number {
  const [lo, hi] = WEATHER_DAMAGE_SPREAD
  const base = WEATHER[weather].conditionCost * (lo + nextFloat(rng) * (hi - lo))
  const mult = WEAR_MULTIPLIERS.find((w) => condition < w.below)?.mult ?? 1
  return Math.max(1, Math.round(base * mult))
}

export function rollChance(rng: RngState, p: number): boolean {
  return p > 0 && nextFloat(rng) < p
}

/** One roll, checked rarest first. Returns the rarity found, or null for nothing. */
export function rollPartRarity(rng: RngState, chances: Record<PartRarity, number>): PartRarity | null {
  let r = nextFloat(rng)
  for (const rarity of ['mythic', 'legendary', 'rare', 'standard'] as const) {
    if (r < chances[rarity]) return rarity
    r -= chances[rarity]
  }
  return null
}

export function rollPick<T>(rng: RngState, items: readonly T[]): T {
  return items[nextInt(rng, 0, items.length - 1)]
}

export function rollWeighted<T>(rng: RngState, items: readonly { item: T; weight: number }[]): T {
  const total = items.reduce((sum, x) => sum + x.weight, 0)
  let r = nextFloat(rng) * total
  for (const x of items) {
    if (r < x.weight) return x.item
    r -= x.weight
  }
  return items[items.length - 1].item
}

/**
 * Weather for one route in one time slot. A pure hash of (seed, route, slot), so weather at
 * any past or future moment is known without stored history and without advancing the RNG.
 */
export function weatherRoll(seed: number, routeId: string, slot: number): number {
  let h = seed ^ 0x9e3779b9
  for (let i = 0; i < routeId.length; i++) h = Math.imul(h ^ routeId.charCodeAt(i), 0x01000193)
  h = Math.imul(h ^ slot, 0x85ebca6b)
  return mix(h)
}
