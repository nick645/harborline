// Deckhands and the tavern. Each hand has one hidden trait; what you hear about them at the
// tavern is right most of the time. A drink (one watch) or a few voyages tell you the truth.
// First-pass numbers, picked to be small next to a captain's traits. All meant to be tuned.

export type HandTraitId = 'steady' | 'quick' | 'thrifty' | 'green' | 'clumsy'

export interface HandTraitDef {
  id: HandTraitId
  name: string
  description: string
  /** What people at the tavern say about a hand with this trait. */
  rumour: string
  weight: number
  /** Hull damage multiplier in rough water and storms. */
  stormDamage?: number
  /** Hull damage multiplier in every weather. */
  damage?: number
  duration?: number
  fuel?: number
}

export const HAND_TRAITS: HandTraitDef[] = [
  { id: 'steady', name: 'Steady in a blow', description: '8% less hull damage in rough water and storms', rumour: 'Never lost their footing in a blow', weight: 2, stormDamage: 0.92 },
  { id: 'quick', name: 'Quick on the lines', description: 'Trips 5% faster', rumour: 'Ties off faster than anyone on the quay', weight: 2, duration: 0.95 },
  { id: 'thrifty', name: 'Easy on the fuel', description: '10% less fuel', rumour: 'Knows how to trim a boat to save fuel', weight: 2, fuel: 0.9 },
  { id: 'green', name: 'Green', description: 'No effect yet', rumour: "Says they've crewed before", weight: 3 },
  { id: 'clumsy', name: 'Butterfingers', description: '6% more hull damage', rumour: 'Dropped a crate off the end of the pier once', weight: 1, damage: 1.06 },
]

/** How often the tavern talk about a hand is right. */
export const HAND_RUMOUR_ACCURACY = 0.7
/** A hand's trait is plain to see after this many voyages. */
export const HAND_KNOWN_AFTER = 5
/** Buying a hand a drink costs this many watches (shared with the quay). */
export const DRINK_WATCHES = 1

/** Hands looking for work at the tavern each 6-hour slot. */
export const TAVERN_HANDS = 4
/** Chance a tavern slot also has a captain well above what the quay offers. */
export const TAVERN_RARE_CHANCE = 0.1
/** How many anchors above the quay's best that captain is (capped at 5). */
export const TAVERN_RARE_BOOST = 2
