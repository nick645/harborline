import type { BoatClass } from '../../../src/game/types'

/** A boat's drawn length in local units: bigger tiers are longer. */
export function boatWidth(cls: BoatClass): number {
  return 120 + cls.sizeTier * 30
}
