// Port upgrade effects and the derived numbers they feed: fleet cap and scout level.

import type { GameState } from './types'
import { FLEET_CAP_BY_TIER, SCOUT_LEVEL_TIERS, UPGRADES, type UpgradeDef, type UpgradeId } from './data/upgrades'
import { MAX_SCOUT_LEVEL } from './data/captains'

const byId = new Map(UPGRADES.map((u) => [u.id, u]))

export function getUpgrade(id: UpgradeId): UpgradeDef {
  const u = byId.get(id)
  if (!u) throw new Error(`Unknown upgrade ${id}`)
  return u
}

export function upgradeLevel(state: GameState, id: UpgradeId): number {
  return state.player.portUpgrades[id] ?? 0
}

/** The upgrade's effect at its current level, or 0 if not built. */
export function upgradeValue(state: GameState, id: UpgradeId): number {
  const level = upgradeLevel(state, id)
  return level === 0 ? 0 : getUpgrade(id).levels[level - 1]
}

/** Cost of the next level, or null at max. */
export function nextUpgradeCost(state: GameState, id: UpgradeId): number | null {
  const level = upgradeLevel(state, id)
  return level >= 3 ? null : getUpgrade(id).costs[level]
}

/** Boats the harbour holds. Pass `withTier` to ask what it would hold after reaching that tier. */
export function fleetCap(state: GameState, withTier = 0): number {
  return FLEET_CAP_BY_TIER[Math.max(state.player.maxTierReached, withTier)] + upgradeValue(state, 'berths')
}

/** 1 to start; +1 at tiers 4 and 6; plus the Scout Office. Capped at 5. */
export function scoutLevel(state: GameState): number {
  const fromTier = SCOUT_LEVEL_TIERS.filter((t) => state.player.maxTierReached >= t).length
  return Math.min(MAX_SCOUT_LEVEL, 1 + fromTier + upgradeValue(state, 'scout-office'))
}
