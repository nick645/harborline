import type { CaptainRole } from '../types'

// Delegation: veteran captains promoted to desk jobs run part of the fleet on their own.
// Automated boats earn less than hand-played ones and never chase storms, swap routes for
// demand, or find rare parts. Delegation buys attention, not profit.

export interface ManagerRoleDef {
  id: Exclude<CaptainRole, 'sailing'>
  name: string
  description: string
  /** Highest boat tier reached before this role can be filled. */
  unlockTier: number
  /** Most boats this manager can run (fleet managers take a whole track). */
  maxBoats: number
  /** Highest boat tier this manager can run (fleet managers: below your top tier). */
  maxBoatTier: number
}

export const MANAGER_ROLES: ManagerRoleDef[] = [
  { id: 'dockhand', name: 'Dockhand', description: 'Runs one tier 1–2 boat', unlockTier: 3, maxBoats: 1, maxBoatTier: 2 },
  { id: 'harbormaster', name: 'Harbormaster', description: 'Runs up to 6 boats below your top tier', unlockTier: 4, maxBoats: 6, maxBoatTier: 5 },
  { id: 'fleet-manager', name: 'Fleet Manager', description: 'Runs every boat on one track below your top tier', unlockTier: 5, maxBoats: Infinity, maxBoatTier: 5 },
]

/** Share of normal pay an automated boat earns. */
export const AUTOMATED_PAY_SHARE = 0.85
/** Automated boats repair themselves below this condition, if the coins are there. */
export const AUTOMATED_REPAIR_BELOW = 50
/** How far ahead (in weather slots) an automated boat will wait for safe weather before giving up. */
export const AUTOMATED_WAIT_SLOTS = 48

/** A manager spends at most this share of a boat's value hiring its captain (never less than the minimum). */
export const MANAGER_HIRE_BUDGET_SHARE = 0.25
export const MANAGER_HIRE_BUDGET_MIN = 350
/** Managers judge a captain they hired only after this many voyages. */
export const MANAGER_JUDGE_AFTER = 20
/** ...and let them go if what's been proven costs at least this much pay. */
export const MANAGER_FIRE_BELOW_PAY = 0.95
