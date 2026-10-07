// First-pass economy values from the build spec. All of these are meant to be tuned.

export const STARTING_COINS = 500
export const STARTING_BOAT_CLASSES = ['dinghy-hauler', 'water-taxi']

/** payout = capacity × demand × distance × PAYOUT_FACTOR − fuelPerLeg × 2 */
export const PAYOUT_FACTOR = 0.8

export const DEMAND_MIN = 0.5
export const DEMAND_MAX = 1.5

export const SELL_RATE = 0.5

export const CONDITION_MAX = 100
/** Base wear per round trip, before the worn-hull multiplier. */
export const CONDITION_LOSS_MIN = 1
export const CONDITION_LOSS_MAX = 3
/** Worn hulls wear faster: the first band the condition is below applies. */
export const WEAR_MULTIPLIERS = [
  { below: 25, mult: 2 },
  { below: 50, mult: 1.5 },
]
/** Chance per trip of a rough-water hit on top of normal wear. Phase 3 weather replaces this. */
export const HEAVY_HIT_CHANCE = 0.03
export const HEAVY_HIT_MIN = 10
export const HEAVY_HIT_MAX = 20
/** Below this condition, payout is multiplied by LOW_CONDITION_PAYOUT_MULT. */
export const LOW_CONDITION_THRESHOLD = 50
export const LOW_CONDITION_PAYOUT_MULT = 0.8
export const REPAIR_COST_PER_POINT = 2

/** A boat at 0 condition sinks. Raising it costs this share of its price, at least the minimum. */
export const SALVAGE_RATE = 0.25
export const SALVAGE_MIN = 100
export const SALVAGE_CONDITION = 10
