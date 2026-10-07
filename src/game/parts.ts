// Part lookup, inventory helpers, and choosing which part a drop or melt produces.

import type { GameState, Part, PartRarity, PartType, RngState, Track, Weather } from './types'
import { PARTS, SPECIALTY_NAME } from './data/parts'
import { BOAT_CLASSES } from './data/boats'
import {
  LEGENDARY_PART_CHANCE,
  LEGENDARY_SET_WEIGHT_PER_PIECE,
  MYTHIC_PART_CHANCE_STORM,
  RARE_PART_CHANCE,
  RARE_PART_MIN_BOAT_TIER,
  STANDARD_PART_CHANCE,
} from './data/economy'
import { rollPick, rollWeighted } from './rolls'
import type { AbilityHooks, TripContext } from './abilities'

const partsById = new Map(PARTS.map((p) => [p.id, p]))
const classesById = new Map(BOAT_CLASSES.map((c) => [c.id, c]))

export function getPart(id: string): Part {
  const p = partsById.get(id)
  if (!p) throw new Error(`Unknown part ${id}`)
  return p
}

export function slotName(type: PartType, track: Track): string {
  return type === 'specialty' ? SPECIALTY_NAME[track] : type === 'hull' ? 'Hull' : 'Engine'
}

export function partName(id: string): string {
  const p = getPart(id)
  const slot = slotName(p.type, p.track)
  if (p.rarity === 'standard') return `Standard ${p.track} ${slot.toLowerCase()}`
  return `${classesById.get(p.setId)?.name ?? p.setId} ${slot.toLowerCase()}`
}

export function countParts(inventory: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const id of inventory) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

/** Remove one copy of each id. Throws if any is missing. */
export function takeParts(inventory: string[], ids: string[]): string[] {
  const left = [...inventory]
  for (const id of ids) {
    const i = left.indexOf(id)
    if (i < 0) throw new Error(`Missing part ${id}`)
    left.splice(i, 1)
  }
  return left
}

export function hasParts(inventory: string[], ids: string[]): boolean {
  const counts = countParts(inventory)
  for (const id of ids) {
    const n = counts.get(id) ?? 0
    if (n <= 0) return false
    counts.set(id, n - 1)
  }
  return true
}

/** Odds for each rarity on one roll at the end of a trip. */
export function dropChances(ctx: TripContext, hooks: AbilityHooks): Record<PartRarity, number> {
  const w: Weather = ctx.weather
  const rough = w === 'rough' || w === 'storm'
  const rareEligible = rough || ctx.cls.sizeTier >= RARE_PART_MIN_BOAT_TIER
  return {
    mythic: w === 'storm' ? MYTHIC_PART_CHANCE_STORM : 0,
    legendary: LEGENDARY_PART_CHANCE[w] + (hooks.legendaryChanceBonus?.(ctx) ?? 0),
    rare: rareEligible ? RARE_PART_CHANCE + (hooks.rareChanceBonus ?? 0) : 0,
    standard: STANDARD_PART_CHANCE,
  }
}

/** A set counts as done once the player owns that boat or holds every piece. */
function setDone(state: GameState, setId: string): boolean {
  const cls = classesById.get(setId)!
  return state.player.ownedBoats.some((b) => b.classId === setId) || hasParts(state.player.partInventory, cls.requiredParts)
}

/**
 * Pick the set for a legendary or mythic find: an unfinished set, weighted toward sets the
 * player already holds pieces of, so the chase closes in instead of stalling one piece short.
 */
export function pickSet(rng: RngState, state: GameState, rarity: 'legendary' | 'mythic', track: Track | null): string | null {
  const held = new Set(state.player.partInventory)
  const candidates = BOAT_CLASSES.filter(
    (c) => c.rarity === rarity && (track === null || c.track === track) && !setDone(state, c.id),
  ).map((c) => ({
    item: c.id,
    weight: 1 + LEGENDARY_SET_WEIGHT_PER_PIECE * c.requiredParts.filter((id) => held.has(id)).length,
  }))
  return candidates.length ? rollWeighted(rng, candidates) : null
}

/** Choose the actual part for a rarity. Returns null if nothing of that rarity can drop. */
export function pickPart(
  rng: RngState,
  state: GameState,
  rarity: PartRarity,
  track: Track,
  slot?: PartType,
): string | null {
  const type = slot ?? rollPick(rng, ['hull', 'engine', 'specialty'] as const)
  if (rarity === 'standard') return `std-${track}-${type}`
  if (rarity === 'rare') {
    const pool = PARTS.filter((p) => p.rarity === 'rare' && p.track === track && (!slot || p.type === slot))
    return pool.length ? rollPick(rng, pool).id : null
  }
  // Mythic sets drop for either track; legendary sets follow the boat that found them.
  const setId = pickSet(rng, state, rarity, rarity === 'mythic' ? null : track)
  if (!setId) return null
  return slot ? `${setId}-${slot}` : rollPick(rng, classesById.get(setId)!.requiredParts)
}
