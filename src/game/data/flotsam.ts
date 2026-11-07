// Flotsam: things that drift past a boat at sea while you watch her, and what tapping one in
// time fishes out. Small on purpose: a moment, not a way to grind. Numbers are Claude's picks
// (user-approved 2026-11-06).

import type { Weather } from '../types'

/** One find per boat per this long. */
export const FLOTSAM_COOLDOWN_MS = 10 * 60 * 1000
/** Coins: this share of what the trip pays, between these bounds. */
export const FLOTSAM_COIN_SHARE: [number, number] = [0.05, 0.15]
/** Chance the find is a standard fitting instead of coins, and a keepsake, by weather. */
export const FLOTSAM_PART_CHANCE: Record<Weather, number> = { calm: 0.15, choppy: 0.2, rough: 0.25, storm: 0.3 }
export const FLOTSAM_KEEPSAKE_CHANCE: Record<Weather, number> = { calm: 0.02, choppy: 0.03, rough: 0.06, storm: 0.12 }
/** What it looks like drifting by, and how the find is told. */
export const FLOTSAM_KINDS = [
  { id: 'bottle', name: 'a bottle with a note in it' },
  { id: 'crate', name: 'a crate gone over some other side' },
  { id: 'barrel', name: 'a bobbing barrel' },
  { id: 'net', name: 'a tangle of net' },
] as const
export type FlotsamKind = (typeof FLOTSAM_KINDS)[number]['id']
