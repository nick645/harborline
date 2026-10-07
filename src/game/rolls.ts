// Every random roll in the game lives here. The RNG is seeded and its state is saved,
// so any bug report can be replayed exactly.

import type { RngState } from './types'
import {
  CONDITION_LOSS_MAX,
  CONDITION_LOSS_MIN,
  DEMAND_MAX,
  DEMAND_MIN,
  HEAVY_HIT_CHANCE,
  HEAVY_HIT_MAX,
  HEAVY_HIT_MIN,
  WEAR_MULTIPLIERS,
} from './data/economy'

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
  let t = rng.state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
}

/** Integer in [min, max], inclusive. */
export function nextInt(rng: RngState, min: number, max: number): number {
  return min + Math.floor(nextFloat(rng) * (max - min + 1))
}

/** Route demand, 0.5–1.5, rounded to 2 decimals for display. */
export function rollDemand(rng: RngState): number {
  const d = DEMAND_MIN + nextFloat(rng) * (DEMAND_MAX - DEMAND_MIN)
  return Math.round(d * 100) / 100
}

/** Condition lost on one round trip. Wear accelerates on worn hulls, plus a rare heavy hit. */
export function rollConditionLoss(rng: RngState, condition: number): number {
  const mult = WEAR_MULTIPLIERS.find((w) => condition < w.below)?.mult ?? 1
  let loss = Math.ceil(nextInt(rng, CONDITION_LOSS_MIN, CONDITION_LOSS_MAX) * mult)
  if (nextFloat(rng) < HEAVY_HIT_CHANCE) loss += nextInt(rng, HEAVY_HIT_MIN, HEAVY_HIT_MAX)
  return loss
}

export function rollPick<T>(rng: RngState, items: readonly T[]): T {
  return items[nextInt(rng, 0, items.length - 1)]
}
